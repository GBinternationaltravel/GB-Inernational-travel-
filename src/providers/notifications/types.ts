import type {
  NotificationPayload,
  NotificationSendResult,
} from "@/types/notification";

/**
 * Channel-level notification provider (Email / SMS / WhatsApp / console).
 * Phase 8: interfaces + stubs only — no real message delivery.
 */
export interface NotificationProvider {
  readonly code: string;
  readonly name: string;
  readonly channel: NotificationPayload["channel"] | "MULTI";
  readonly isStub: boolean;

  send(payload: NotificationPayload): Promise<NotificationSendResult>;
  healthCheck?(): Promise<boolean>;
}

export interface ChannelNotificationRouter {
  sendToChannels(
    payloads: NotificationPayload[],
  ): Promise<NotificationSendResult[]>;
}
