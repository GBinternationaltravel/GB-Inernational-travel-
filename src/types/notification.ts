export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";

export type NotificationEventType =
  | "BOOKING_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "TICKETING_STATUS"
  | "TICKETING_PENDING"
  | "DEPARTURE_REMINDER_24H"
  | "BOARDING_REMINDER_5H"
  | "TRIP_7_DAYS"
  | "TRIP_24_HOURS"
  | "TRIP_5_HOURS"
  | "BOARDING_REMINDER"
  | "FLIGHT_STATUS_CHANGED"
  | "DESTINATION_WEATHER_UPDATE"
  | "WEATHER_ALERT"
  | "ARRIVAL_REMINDER";

export interface NotificationPayload {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  /** Never include passport numbers, full card data, or API secrets. */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationSendResult {
  success: boolean;
  channel: NotificationChannel;
  providerCode: string;
  messageId?: string;
  error?: string;
  /** True when the provider only logs / stubs and does not deliver. */
  isStub?: boolean;
}

export interface MultiChannelNotificationRequest {
  eventType: NotificationEventType;
  subject?: string;
  body: string;
  email?: string;
  phoneE164?: string;
  whatsappE164?: string;
  metadata?: Record<string, string | number | boolean | null>;
  channels?: NotificationChannel[];
}

export interface TravelReminderPlan {
  bookingReference: string;
  departureAt: string;
  reminders: Array<{
    eventType: NotificationEventType;
    scheduledFor: string;
    description: string;
  }>;
}
