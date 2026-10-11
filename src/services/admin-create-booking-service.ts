import type { UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import {
  findForbiddenAdminPriceKeys,
  adminCreateBookingSchema,
  adminInventorySearchSchema,
  parseAdminCreateBookingDraft,
  toBookingDraftPayload,
  type AdminCreateBookingInput,
} from "@/lib/validations/admin-booking";
import { getBookingFieldErrors } from "@/lib/validations/booking";
import {
  BookingServiceError,
  acceptBookingTerms,
  createOrUpdateBookingDraft,
} from "@/services/booking-service";
import {
  getFlightOfferById,
  revalidateFlightOffer,
  searchFlights,
} from "@/services/flight-service";
import type { FlightOffer } from "@/types/flight";
import type { SafeBookingView } from "@/types/booking";
import type { RevalidateOfferInput, RevalidateOfferResult } from "@/providers/flights/supplier-types";
import { writeAuditLog, type AuditLogInput } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";

export type CreateAdminBookingActor = {
  actorId: string;
  actorRole: UserRole;
};

export type CreateAdminBookingResult = {
  reference: string;
  status: string;
  currency: string;
  totalAmount: number;
  customerUserId: string | null;
  channel: AdminCreateBookingInput["channel"];
  store: SafeBookingView["store"];
};

export type AdminInventorySearchResult = {
  outbound: FlightOffer[];
  inbound: FlightOffer[];
  isMock: boolean;
  supplierCode: string;
};

export type AdminCustomerLookup = {
  findByEmail: (email: string) => Promise<{
    id: string;
    role: UserRole;
    isActive: boolean;
  } | null>;
};

export type CreateAdminBookingDeps = {
  getOffer: typeof getFlightOfferById;
  revalidate: typeof revalidateFlightOffer;
  createDraft: typeof createOrUpdateBookingDraft;
  acceptTerms: typeof acceptBookingTerms;
  writeAudit: (input: AuditLogInput) => Promise<unknown>;
  /**
   * Optional customer-account lookup. Production uses getUserRepository.
   * Only findByEmail/role/isActive are required — this is the real lookup
   * contract, not a stub to satisfy the type checker.
   */
  getUsers: () => Promise<{
    kind: "prisma" | "file";
    repo: AdminCustomerLookup;
  }>;
  search: typeof searchFlights;
};

const defaultDeps: CreateAdminBookingDeps = {
  getOffer: getFlightOfferById,
  revalidate: revalidateFlightOffer,
  createDraft: createOrUpdateBookingDraft,
  acceptTerms: acceptBookingTerms,
  writeAudit: writeAuditLog,
  getUsers: getUserRepository,
  search: searchFlights,
};

function validationError(message: string, fields?: Record<string, string>) {
  return new AdminServiceError(message, "VALIDATION", fields);
}

async function resolveOffer(
  getOffer: typeof getFlightOfferById,
  offerId: string,
  context: { departureDate: string; origin: string; destination: string },
  label: "outbound" | "return",
): Promise<FlightOffer> {
  const offer = await getOffer(offerId, context);
  if (!offer) {
    throw validationError(
      label === "return"
        ? "The selected return flight is no longer available."
        : "The selected outbound flight is no longer available.",
      { [label === "return" ? "returnOfferId" : "offerId"]: "Flight is no longer available." },
    );
  }

  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  if (
    !first ||
    !last ||
    first.origin.iataCode !== context.origin.toUpperCase() ||
    last.destination.iataCode !== context.destination.toUpperCase()
  ) {
    throw validationError("The selected flight does not match this search.", {
      [label === "return" ? "returnOfferId" : "offerId"]: "Flight does not match this search.",
    });
  }

  return offer;
}

async function assertOfferStillBookable(
  revalidate: typeof revalidateFlightOffer,
  offer: FlightOffer,
  departureDate: string,
): Promise<FlightOffer> {
  const input: RevalidateOfferInput = {
    internalOfferId: offer.id,
    supplierOfferId: offer.supplierOfferId || offer.id,
    supplierCode: offer.supplierCode || offer.providerCode,
    supplierSessionRef: offer.supplierSessionRef,
    expectedTotal: offer.totalPrice,
    currency: offer.currency,
    departureDate,
  };

  let result: RevalidateOfferResult;
  try {
    result = await revalidate(input);
  } catch {
    return offer;
  }

  if (result.status === "EXPIRED" || result.status === "NO_AVAILABILITY") {
    throw validationError(result.message || "This flight is no longer available.", {
      offerId: result.message || "This flight is no longer available.",
    });
  }

  return result.offer ?? offer;
}

async function resolveCustomerUserId(
  input: AdminCreateBookingInput,
  actorId: string,
  getUsers: CreateAdminBookingDeps["getUsers"],
): Promise<string | null> {
  if (!input.linkExistingCustomer) return null;

  const { repo } = await getUsers();
  const found = await repo.findByEmail(input.contact.email.toLowerCase());
  if (!found || !found.isActive || found.role !== "CUSTOMER") return null;
  if (found.id === actorId) return null;
  return found.id;
}

export async function searchAdminInventory(
  actor: CreateAdminBookingActor,
  raw: unknown,
  deps: Partial<CreateAdminBookingDeps> = {},
): Promise<AdminInventorySearchResult> {
  if (!hasPermission(actor.actorRole, "bookings.create")) {
    throw new AdminServiceError("You cannot create bookings.", "FORBIDDEN_ACTION");
  }

  const parsed = adminInventorySearchSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues[0]?.message ?? "Please check the search details.",
      getBookingFieldErrors(parsed.error),
    );
  }

  const search = deps.search ?? defaultDeps.search;
  const data = parsed.data;
  const outboundResult = await search({
    tripType: data.tripType,
    origin: data.origin,
    destination: data.destination,
    departureDate: data.departureDate,
    returnDate: data.returnDate,
    adults: data.adults,
    children: data.children,
    infants: data.infants,
    cabinClass: data.cabinClass,
    currency: "PKR",
  });

  let inbound: FlightOffer[] = [];
  let isMock = outboundResult.isMock;
  if (data.tripType === "ROUND_TRIP" && data.returnDate) {
    const inboundResult = await search({
      tripType: "ONE_WAY",
      origin: data.destination,
      destination: data.origin,
      departureDate: data.returnDate,
      returnDate: undefined,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      cabinClass: data.cabinClass,
      currency: "PKR",
    });
    inbound = inboundResult.offers;
    isMock = isMock || inboundResult.isMock;
  }

  return {
    outbound: outboundResult.offers,
    inbound,
    isMock,
    supplierCode: outboundResult.supplierCode,
  };
}

export async function createAdminBooking(
  actor: CreateAdminBookingActor,
  raw: unknown,
  deps: Partial<CreateAdminBookingDeps> = {},
): Promise<CreateAdminBookingResult> {
  if (!hasPermission(actor.actorRole, "bookings.create")) {
    throw new AdminServiceError("You cannot create bookings.", "FORBIDDEN_ACTION");
  }

  const forbidden = findForbiddenAdminPriceKeys(raw);
  if (forbidden.length > 0) {
    throw validationError("Booking totals are calculated on the server and cannot be overridden.", {
      form: "Booking totals are calculated on the server and cannot be overridden.",
    });
  }

  const parsed = adminCreateBookingSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues[0]?.message ?? "Please check the booking details.",
      getBookingFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;
  const resolved = { ...defaultDeps, ...deps };

  const outbound = await resolveOffer(
    resolved.getOffer,
    input.offerId,
    {
      departureDate: input.departureDate,
      origin: input.origin,
      destination: input.destination,
    },
    "outbound",
  );

  let inbound: FlightOffer | undefined;
  if (input.tripType === "ROUND_TRIP") {
    inbound = await resolveOffer(
      resolved.getOffer,
      input.returnOfferId!,
      {
        departureDate: input.returnDate!,
        origin: input.destination,
        destination: input.origin,
      },
      "return",
    );
  }

  const liveOutbound = await assertOfferStillBookable(
    resolved.revalidate,
    outbound,
    input.departureDate,
  );
  const liveInbound = inbound
    ? await assertOfferStillBookable(resolved.revalidate, inbound, input.returnDate!)
    : undefined;

  const draftParsed = parseAdminCreateBookingDraft(input, {
    outboundOffer: liveOutbound,
    returnOffer: liveInbound,
  });
  if (!draftParsed.success) {
    throw validationError(
      draftParsed.error.issues[0]?.message ?? "Please check the passenger details.",
      getBookingFieldErrors(draftParsed.error),
    );
  }

  const customerUserId = await resolveCustomerUserId(input, actor.actorId, resolved.getUsers);

  let draft;
  try {
    draft = await resolved.createDraft(
      toBookingDraftPayload(input),
      undefined,
      customerUserId,
    );
  } catch (error) {
    if (error instanceof BookingServiceError) {
      throw new AdminServiceError(error.message, "VALIDATION", error.fields);
    }
    throw error;
  }

  let accepted: SafeBookingView;
  try {
    accepted = await resolved.acceptTerms(draft.reference, draft.accessToken);
  } catch (error) {
    if (error instanceof BookingServiceError) {
      throw new AdminServiceError(error.message, "VALIDATION", error.fields);
    }
    throw error;
  }

  if (accepted.status !== "PENDING_PAYMENT") {
    throw new AdminServiceError(
      "The booking was created but did not reach pending payment.",
      "VALIDATION",
    );
  }

  await resolved.writeAudit({
    userId: actor.actorId,
    action: "ADMIN_BOOKING_CREATED",
    entityType: "Booking",
    entityId: accepted.reference,
    metadata: {
      channel: input.channel,
      actorRole: actor.actorRole,
      customerUserId,
      store: accepted.store,
      tripType: input.tripType,
    },
  });

  return {
    reference: accepted.reference,
    status: accepted.status,
    currency: accepted.currency,
    totalAmount: accepted.totalAmount,
    customerUserId,
    channel: input.channel,
    store: accepted.store,
  };
}
