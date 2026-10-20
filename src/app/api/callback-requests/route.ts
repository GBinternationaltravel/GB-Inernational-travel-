import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getNotificationProvider } from "@/providers/registry";
import { writeAuditLog } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { callbackRequestSchema } from "@/lib/validations/callback-request";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const limited = rateLimit(`callback:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, message: "Please wait a few minutes before asking again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Please check the form." }, { status: 400 });
  }

  const parsed = callbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, message: "Please check the form.", fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.companyWebsite) {
    return NextResponse.json({ ok: true });
  }

  const inbox = process.env.BOOKING_REQUEST_EMAIL?.trim() || siteConfig.contactEmail;
  const text = [
    "Callback request",
    `Name: ${parsed.data.name}`,
    `Phone: ${parsed.data.phone}`,
    `Message: ${parsed.data.message || "—"}`,
    "This is a request for a call. It is not a booking and not a ticket.",
  ].join("\n");

  await writeAuditLog({
    action: "CALLBACK_REQUEST",
    entityType: "CallbackRequest",
    ipAddress: ip,
    metadata: { name: parsed.data.name, phone: parsed.data.phone },
  });

  try {
    await getNotificationProvider().send({
      eventType: "TICKETING_PENDING",
      channel: "EMAIL",
      recipient: inbox,
      subject: `Callback request from ${parsed.data.name}`,
      body: text,
    });
  } catch (error) {
    console.error("[callback] email failed", error instanceof Error ? error.message : "failed");
  }

  return NextResponse.json({ ok: true });
}
