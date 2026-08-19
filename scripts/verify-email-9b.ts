/**
 * Phase 9B controlled Resend email verification.
 * Sends ONLY to PHASE9B_TEST_EMAIL when Resend is configured.
 *
 * Usage: npx tsx scripts/verify-email-9b.ts
 */
import { getNotificationEnv } from "../src/config/notifications";
import { setNotificationProvider } from "../src/providers/registry";
import { ConsoleNotificationProvider } from "../src/providers/notifications/console-notification-provider";
import { ResendEmailProvider } from "../src/providers/notifications/resend-email-provider";
import { dispatchTravelNotification } from "../src/services/notification-service";
import type { TravelNotificationTemplateKey } from "../src/services/notification-templates";

const TEMPLATES: TravelNotificationTemplateKey[] = [
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_CHANGED",
  "DEPARTURE_24_HOURS",
  "BOARDING_3_HOURS",
  "BOARDING_5_HOURS",
  "WEATHER_UPDATE",
  "FLIGHT_STATUS_CHANGE",
];

async function main() {
  // Controlled verification only — never used for production customer sends.
  process.env.ALLOW_OPTIONAL_EMAILS_WITHOUT_OPT_IN = "true";

  const env = getNotificationEnv();
  const testEmail = process.env.PHASE9B_TEST_EMAIL?.trim() || "";

  console.info("[verify:email]", {
    configuredMode: env.configuredMode,
    activeMode: env.mode,
    hasCredentials: env.hasCredentials,
    useLive: env.useLive,
    testEmailConfigured: Boolean(testEmail),
  });

  if (!env.useLive) {
    setNotificationProvider(new ConsoleNotificationProvider());
    console.info("[verify:email] LIVE_VERIFICATION=SKIPPED (Resend not configured)");
    for (const template of TEMPLATES) {
      const result = await dispatchTravelNotification({
        template,
        bookingReference: "GB-9B-TEST",
        recipientEmail: testEmail || "phase9b-dev@example.com",
        destinationCity: "Dubai",
        flightNumber: "PK309",
        weatherSummary: "Sample weather summary for verification only.",
        idempotencyKey: `${template}:GB-9B-TEST:EMAIL:console-${Date.now()}`,
      });
      console.info("[verify:email:console]", { template, success: result.success, provider: result.providerCode });
    }
    return;
  }

  if (!testEmail) {
    console.info(
      "[verify:email] LIVE_VERIFICATION=BLOCKED — set PHASE9B_TEST_EMAIL to a mailbox you control before sending live tests.",
    );
    return;
  }

  setNotificationProvider(new ResendEmailProvider());
  console.info("[verify:email] LIVE_VERIFICATION=ATTEMPTED (controlled recipient only)");
  for (const template of TEMPLATES) {
    const result = await dispatchTravelNotification({
      template,
      bookingReference: "GB-9B-TEST",
      recipientEmail: testEmail,
      destinationCity: "Dubai",
      flightNumber: "PK309",
      weatherSummary: "Controlled Phase 9B weather email verification.",
      idempotencyKey: `${template}:GB-9B-TEST:EMAIL:${new Date().toISOString().slice(0, 10)}`,
    });
    console.info("[verify:email:resend]", {
      template,
      success: result.success,
      provider: result.providerCode,
      error: result.error ?? null,
    });
  }
}

main().catch((error) => {
  console.error("[verify:email] failed", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});
