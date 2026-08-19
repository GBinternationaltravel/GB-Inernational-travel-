import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type { NotificationProvider } from "@/providers/notifications/types";
import { getNotificationEnv } from "@/config/notifications";

/**
 * Resend email adapter (selected Phase 9A email provider).
 * Server-side RESEND_API_KEY only — never NEXT_PUBLIC_*.
 */
export class ResendEmailProvider implements NotificationProvider {
  readonly code = "RESEND";
  readonly name = "Resend Email Provider";
  readonly channel = "EMAIL" as const;
  readonly isStub = false;

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (payload.channel !== "EMAIL") {
      return {
        success: false,
        channel: payload.channel,
        providerCode: this.code,
        error: "RESEND_EMAIL_CHANNEL_ONLY",
      };
    }

    const env = getNotificationEnv();
    if (!env.apiKey) {
      return {
        success: false,
        channel: "EMAIL",
        providerCode: this.code,
        error: "RESEND_NOT_CONFIGURED",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.timeoutMs);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.fromEmail,
          to: [payload.recipient],
          subject: payload.subject ?? "GB International Travel",
          text: payload.body,
          html: payload.htmlBody ?? plainToHtml(payload.body),
        }),
      });

      if (!response.ok) {
        const safeStatus = `RESEND_HTTP_${response.status}`;
        console.warn("[notification:resend] send failed", { status: response.status });
        return {
          success: false,
          channel: "EMAIL",
          providerCode: this.code,
          error: safeStatus,
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        success: true,
        channel: "EMAIL",
        providerCode: this.code,
        messageId: data.id,
        isStub: false,
      };
    } catch (error) {
      const aborted =
        error instanceof Error && error.name === "AbortError"
          ? "RESEND_TIMEOUT"
          : "RESEND_REQUEST_FAILED";
      console.warn("[notification:resend] request error", { code: aborted });
      return {
        success: false,
        channel: "EMAIL",
        providerCode: this.code,
        error: aborted,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<boolean> {
    return getNotificationEnv().hasCredentials;
  }
}

function plainToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
}
