import { randomBytes } from "crypto";
import { siteConfig } from "@/config/site";
import { getNotificationProvider } from "@/providers/registry";
import { writeAuditLog } from "@/lib/security/audit";
import type { BookingRequestInput } from "@/lib/validations/booking-request";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRequestReference(): string {
  const bytes = randomBytes(8);
  let reference = "REQ";
  for (const byte of bytes) {
    reference += alphabet[byte % alphabet.length];
  }
  return reference;
}

export function bookingRequestInbox(): string {
  return process.env.BOOKING_REQUEST_EMAIL?.trim() || siteConfig.contactEmail;
}

export async function deliverBookingRequest(input: {
  reference: string;
  data: BookingRequestInput;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ emailed: boolean }> {
  const { reference, data } = input;
  const names =
    data.passengerNames.trim() || `${data.name} (contact name used as the only passenger)`;
  const body = [
    `Booking request ${reference}`,
    "This is a request, not a ticket.",
    "",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email || "—"}`,
    `Passengers: ${names}`,
    `Party: ${data.adults} adult(s), ${data.children} child(ren), ${data.infants} infant(s)`,
    `Route: ${data.origin} → ${data.destination}`,
    `Departure: ${data.departureDate}`,
    `Return: ${data.returnDate || "—"}`,
    `Airline: ${data.airline || "—"}`,
    `Flight: ${data.flightNumber || "—"}`,
    `Return flight: ${data.returnFlightNumber || "—"}`,
    `Price shown to customer: ${data.priceLabel || "—"}`,
    "",
    "Confirm availability and the fare before ticketing. Do not treat this request as payment or as a confirmed seat.",
  ].join("\n");

  await writeAuditLog({
    action: "BOOKING_REQUEST",
    entityType: "BookingRequest",
    entityId: reference,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      reference,
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      origin: data.origin,
      destination: data.destination,
      departureDate: data.departureDate,
      returnDate: data.returnDate || null,
      airline: data.airline || null,
      flightNumber: data.flightNumber || null,
      priceLabel: data.priceLabel || null,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
    },
  });

  try {
    const result = await getNotificationProvider().send({
      eventType: "TICKETING_PENDING",
      channel: "EMAIL",
      recipient: bookingRequestInbox(),
      subject: `Booking request ${reference} — ${data.origin} to ${data.destination}`,
      body,
    });
    return { emailed: result.success };
  } catch {
    return { emailed: false };
  }
}
