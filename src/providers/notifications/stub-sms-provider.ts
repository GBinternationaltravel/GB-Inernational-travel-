import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type { NotificationProvider } from "@/providers/notifications/types";

/**
 * SMS channel adapter stub. No carrier/API calls in Phase 8.
 */
export class StubSmsNotificationProvider implements NotificationProvider {
  readonly code = "SMS_STUB";
  readonly name = "SMS Notification Stub";
  readonly channel = "SMS" as const;
  readonly isStub = true;

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (payload.channel !== "SMS") {
      return {
        success: false,
        channel: payload.channel,
        providerCode: this.code,
        error: "SMS_STUB_CHANNEL_MISMATCH",
        isStub: true,
      };
    }

    console.info("[notification:sms:stub]", {
      eventType: payload.eventType,
      recipient: payload.recipient,
    });

    return {
      success: true,
      channel: "SMS",
      providerCode: this.code,
      messageId: `sms-stub-${Date.now()}`,
      isStub: true,
    };
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
