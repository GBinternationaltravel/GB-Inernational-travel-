import type {
  NotificationEventType,
  NotificationPayload,
} from "@/types/notification";
import { renderTravelEmail } from "@/lib/notifications/email-templates";

/**
 * Travel notification templates.
 */
export type TravelNotificationTemplateKey =
  | "PAYMENT_RECEIVED"
  | "TICKETING_PENDING"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CHANGED"
  | "DEPARTURE_24_HOURS"
  | "BOARDING_3_HOURS"
  | "BOARDING_5_HOURS"
  | "WEATHER_UPDATE"
  | "FLIGHT_STATUS_CHANGE";

const eventMap: Record<TravelNotificationTemplateKey, NotificationEventType> = {
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  TICKETING_PENDING: "TICKETING_PENDING",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "TICKETING_STATUS",
  BOOKING_CHANGED: "FLIGHT_STATUS_CHANGED",
  DEPARTURE_24_HOURS: "DEPARTURE_REMINDER_24H",
  BOARDING_3_HOURS: "BOARDING_REMINDER",
  BOARDING_5_HOURS: "BOARDING_REMINDER_5H",
  WEATHER_UPDATE: "DESTINATION_WEATHER_UPDATE",
  FLIGHT_STATUS_CHANGE: "FLIGHT_STATUS_CHANGED",
};

export function createTravelNotification(input: {
  template: TravelNotificationTemplateKey;
  bookingReference: string;
  recipientEmail: string;
  destinationCity?: string;
  flightNumber?: string;
  weatherSummary?: string;
}): NotificationPayload {
  const rendered = renderTravelEmail({
    template: input.template,
    bookingReference: input.bookingReference,
    destinationCity: input.destinationCity,
    flightNumber: input.flightNumber,
    weatherSummary: input.weatherSummary,
  });

  return {
    eventType: eventMap[input.template],
    channel: "EMAIL",
    recipient: input.recipientEmail,
    subject: rendered.subject,
    body: rendered.text,
    htmlBody: rendered.html,
    metadata: {
      bookingReference: input.bookingReference,
      template: input.template,
      destinationCity: input.destinationCity ?? null,
      flightNumber: input.flightNumber ?? null,
    },
  };
}

export { eventMap as travelNotificationEventMap };
