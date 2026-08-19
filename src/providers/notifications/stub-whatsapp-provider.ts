import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type { NotificationProvider } from "@/providers/notifications/types";

/**
 * WhatsApp channel adapter stub. No WhatsApp Business API calls in Phase 8.
 */
export class StubWhatsAppNotificationProvider implements NotificationProvider {
  readonly code = "WHATSAPP_STUB";
  readonly name = "WhatsApp Notification Stub";
  readonly channel = "WHATSAPP" as const;
  readonly isStub = true;

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (payload.channel !== "WHATSAPP") {
      return {
        success: false,
        channel: payload.channel,
        providerCode: this.code,
        error: "WHATSAPP_STUB_CHANNEL_MISMATCH",
        isStub: true,
      };
    }

    console.info("[notification:whatsapp:stub]", {
      eventType: payload.eventType,
      recipient: payload.recipient,
    });

    return {
      success: true,
      channel: "WHATSAPP",
      providerCode: this.code,
      messageId: `wa-stub-${Date.now()}`,
      isStub: true,
    };
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
