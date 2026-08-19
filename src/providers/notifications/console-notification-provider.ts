import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type { NotificationProvider } from "@/providers/notifications/types";

/**
 * Logs notifications during development. Does not deliver messages.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  readonly code = "CONSOLE";
  readonly name = "Console Notification Provider";
  readonly channel = "MULTI" as const;
  readonly isStub = true;

  async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    console.info("[notification:stub]", {
      eventType: payload.eventType,
      channel: payload.channel,
      recipient: payload.recipient,
      subject: payload.subject,
    });

    return {
      success: true,
      channel: payload.channel,
      providerCode: this.code,
      messageId: `console-${Date.now()}`,
      isStub: true,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
