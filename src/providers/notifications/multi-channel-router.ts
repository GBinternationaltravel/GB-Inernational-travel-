import type {
  NotificationChannel,
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";
import type {
  ChannelNotificationRouter,
  NotificationProvider,
} from "@/providers/notifications/types";
import { StubEmailNotificationProvider } from "@/providers/notifications/stub-email-provider";
import { StubSmsNotificationProvider } from "@/providers/notifications/stub-sms-provider";
import { StubWhatsAppNotificationProvider } from "@/providers/notifications/stub-whatsapp-provider";
import { ConsoleNotificationProvider } from "@/providers/notifications/console-notification-provider";

/**
 * Routes notifications to channel stubs (Email / SMS / WhatsApp).
 * Does not send real messages in Phase 8.
 */
export class MultiChannelNotificationRouter implements ChannelNotificationRouter {
  private readonly byChannel: Record<
    Exclude<NotificationChannel, "IN_APP">,
    NotificationProvider
  >;
  private readonly fallback: NotificationProvider;

  constructor(providers?: {
    email?: NotificationProvider;
    sms?: NotificationProvider;
    whatsapp?: NotificationProvider;
    fallback?: NotificationProvider;
  }) {
    this.byChannel = {
      EMAIL: providers?.email ?? new StubEmailNotificationProvider(),
      SMS: providers?.sms ?? new StubSmsNotificationProvider(),
      WHATSAPP: providers?.whatsapp ?? new StubWhatsAppNotificationProvider(),
    };
    this.fallback = providers?.fallback ?? new ConsoleNotificationProvider();
  }

  async sendToChannels(
    payloads: NotificationPayload[],
  ): Promise<NotificationSendResult[]> {
    const results: NotificationSendResult[] = [];
    for (const payload of payloads) {
      const provider =
        payload.channel === "IN_APP"
          ? this.fallback
          : (this.byChannel[payload.channel] ?? this.fallback);
      results.push(await provider.send(payload));
    }
    return results;
  }
}
