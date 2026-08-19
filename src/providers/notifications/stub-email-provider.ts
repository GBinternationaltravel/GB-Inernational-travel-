import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type { NotificationProvider } from "@/providers/notifications/types";

/**
 * Email channel adapter stub. No SMTP/API calls in Phase 8.
 */
export class StubEmailNotificationProvider implements NotificationProvider {
  readonly code = "EMAIL_STUB";
  readonly name = "Email Notification Stub";
  readonly channel = "EMAIL" as const;
  readonly isStub = true;

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (payload.channel !== "EMAIL") {
      return {
        success: false,
        channel: payload.channel,
        providerCode: this.code,
        error: "EMAIL_STUB_CHANNEL_MISMATCH",
        isStub: true,
      };
    }

    console.info("[notification:email:stub]", {
      eventType: payload.eventType,
      recipient: payload.recipient,
      subject: payload.subject,
    });

    return {
      success: true,
      channel: "EMAIL",
      providerCode: this.code,
      messageId: `email-stub-${Date.now()}`,
      isStub: true,
    };
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
