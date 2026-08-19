import { NextResponse } from "next/server";
import {
  searchFlights,
  toCustomerSupplierMessage,
  SupplierError,
} from "@/services/flight-service";
import { parseAndValidateSearchParams } from "@/lib/flights/search-params";
import { flightSearchSchema } from "@/lib/validations/flight";
import { rateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const limited = rateLimit(`flights:search:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(limited.resetAt),
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);

  // Prefer canonical public params (from/to/...), fall back to internal names.
  const hasCanonical = searchParams.has("from") || searchParams.has("to");
  const parsed = hasCanonical
    ? parseAndValidateSearchParams(searchParams)
    : (() => {
        const result = flightSearchSchema.safeParse({
          tripType: searchParams.get("tripType") ?? "ONE_WAY",
          origin: searchParams.get("origin"),
          destination: searchParams.get("destination"),
          departureDate: searchParams.get("departureDate"),
          returnDate: searchParams.get("returnDate") ?? undefined,
          adults: Number(searchParams.get("adults") ?? 1),
          children: Number(searchParams.get("children") ?? 0),
          infants: Number(searchParams.get("infants") ?? 0),
          cabinClass: searchParams.get("cabinClass") ?? "ECONOMY",
          currency: searchParams.get("currency") ?? "PKR",
        });
        if (!result.success) {
          return {
            success: false as const,
            form: parseAndValidateSearchParams(searchParams).form,
            message: result.error.issues[0]?.message ?? "Invalid search parameters",
          };
        }
        return {
          success: true as const,
          data: result.data,
          form: parseAndValidateSearchParams(searchParams).form,
        };
      })();

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check your search details.",
        message: parsed.message,
      },
      { status: 400 },
    );
  }

  try {
    const result = await searchFlights(parsed.data);

    await writeAuditLog({
      action: "FLIGHT_SEARCH",
      entityType: "FlightSearch",
      metadata: {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        providerCode: result.providerCode,
        supplierCode: result.supplierCode,
        resultsCount: result.offers.length,
        isMock: result.isMock,
      },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(
      {
        ...result,
        notice: result.isMock
          ? "Results are from Mock Flight Supplier for development only. Not live airline inventory."
          : "Live pre-production supplier data. Not confirmed flights or issued tickets.",
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(limited.remaining),
          "X-RateLimit-Reset": String(limited.resetAt),
        },
      },
    );
  } catch (error) {
    const message = toCustomerSupplierMessage(error);
    const status =
      error instanceof SupplierError && error.code === "NOT_CONFIGURED"
        ? 503
        : error instanceof SupplierError && error.code === "INVALID_REQUEST"
          ? 400
          : 502;
    return NextResponse.json(
      {
        error: message,
        code: error instanceof SupplierError ? error.code : "SUPPLIER_UNAVAILABLE",
        offers: [],
        isMock: false,
      },
      {
        status,
        headers: {
          "X-RateLimit-Remaining": String(limited.remaining),
          "X-RateLimit-Reset": String(limited.resetAt),
        },
      },
    );
  }
}
