import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createInventoryFlight,
  inventoryFlightActiveSchema,
  inventoryFlightInputSchema,
  setInventoryFlightActive,
  updateInventoryFlight,
} from "@/services/flight-inventory-service";

/**
 * Admin inventory flights.
 * POST  { ...flight }                         → create flight
 * POST  { action: "set-active", id, isActive } → activate / deactivate
 * PATCH { id, ...flight }                     → update flight
 */

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

function badRequest(error: z.ZodError) {
  return NextResponse.json(
    { error: error.issues[0]?.message ?? "Invalid request." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const limited = rateLimit(`admin:flights-create:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "flights.manage" });
    const json = (await request.json()) as Record<string, unknown>;

    if (json?.action === "set-active") {
      const parsed = inventoryFlightActiveSchema.safeParse(json);
      if (!parsed.success) return badRequest(parsed.error);
      const result = await setInventoryFlightActive({
        actorId: admin.id,
        id: parsed.data.id,
        isActive: parsed.data.isActive,
      });
      return NextResponse.json(result);
    }

    const parsed = inventoryFlightInputSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);
    const result = await createInventoryFlight({ actorId: admin.id, data: parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not save flight.");
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(`admin:flights-update:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "flights.manage" });
    const json = (await request.json()) as Record<string, unknown>;
    const id = typeof json?.id === "string" ? json.id : "";
    if (!id) {
      return NextResponse.json({ error: "Flight id is required." }, { status: 400 });
    }
    const parsed = inventoryFlightInputSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);
    const result = await updateInventoryFlight({ actorId: admin.id, id, data: parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update flight.");
  }
}
