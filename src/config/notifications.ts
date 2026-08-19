export type EmailProviderMode = "console" | "resend";

export function getNotificationEnv() {
  const modeRaw = (process.env.EMAIL_PROVIDER ?? "console").trim().toLowerCase();
  const mode: EmailProviderMode = modeRaw === "resend" ? "resend" : "console";
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const fromEmail =
    process.env.EMAIL_FROM?.trim() || "GB International Travel <noreply@example.com>";
  const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS ?? "10000");
  const hasCredentials = Boolean(apiKey);
  const useLive = mode === "resend" && hasCredentials;

  return {
    mode: useLive ? ("resend" as const) : ("console" as const),
    configuredMode: mode,
    apiKey,
    fromEmail,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
    hasCredentials,
    useLive,
    reminderCronSecret: process.env.REMINDER_CRON_SECRET?.trim() || "",
    /** When true, weather/status emails may send without user travelRemindersOptIn (dev only). */
    allowOptionalEmailsWithoutOptIn:
      process.env.ALLOW_OPTIONAL_EMAILS_WITHOUT_OPT_IN === "true",
  };
}
