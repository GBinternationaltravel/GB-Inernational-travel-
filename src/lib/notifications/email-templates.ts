import type { TravelNotificationTemplateKey } from "@/services/notification-templates";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Safe HTML + plain-text travel email templates.
 * Never include passport numbers, payment card data, or secrets.
 */
export function renderTravelEmail(input: {
  template: TravelNotificationTemplateKey;
  bookingReference: string;
  destinationCity?: string;
  flightNumber?: string;
  weatherSummary?: string;
}): RenderedEmail {
  const destination = input.destinationCity ?? "your destination";
  const flight = input.flightNumber ?? "your flight";
  const ref = input.bookingReference;

  const content: Record<
    TravelNotificationTemplateKey,
    { subject: string; text: string; intro: string }
  > = {
    PAYMENT_RECEIVED: {
      subject: `Payment received · ${ref}`,
      intro: "We received your payment.",
      text: `Payment received for booking ${ref}. Your booking is awaiting ticket confirmation. This is not an airline ticket.`,
    },
    TICKETING_PENDING: {
      subject: `Ticketing pending · ${ref}`,
      intro: "Your booking is awaiting ticket confirmation.",
      text: `Booking ${ref} is in ticketing pending status. An airline ticket has not been confirmed yet.`,
    },
    BOOKING_CONFIRMED: {
      subject: `Ticket issued · ${ref}`,
      intro: "Your ticket has been issued.",
      text: `Booking ${ref} is confirmed and a ticket document reference has been recorded for ${flight}. Keep this confirmation for your records. Always verify final boarding details with the operating airline.`,
    },
    BOOKING_CANCELLED: {
      subject: `Booking cancelled · ${ref}`,
      intro: "Your booking has been cancelled.",
      text: `Booking ${ref} has been cancelled. If a refund applies, it will be processed according to the fare rules and payment method used.`,
    },
    BOOKING_CHANGED: {
      subject: `Booking change · ${ref}`,
      intro: "A change was recorded for your booking.",
      text: `A schedule or itinerary change notice was recorded for ${flight} (booking ${ref}). Please review your trip details and contact support if you need assistance.`,
    },
    DEPARTURE_24_HOURS: {
      subject: `Departure reminder · ${ref}`,
      intro: "Your departure is about 24 hours away.",
      text: `Reminder: ${flight} for booking ${ref} is scheduled to depart in about 24 hours. Check documents and airport timing.`,
    },
    BOARDING_3_HOURS: {
      subject: `Travel reminder · ${ref}`,
      intro: "Your departure is about 3 hours away.",
      text: `Reminder: ${flight} for booking ${ref} is about 3 hours from scheduled departure. Plan to be at the airport with required documents.`,
    },
    BOARDING_5_HOURS: {
      subject: `Boarding reminder · ${ref}`,
      intro: "Your departure is about 5 hours away.",
      text: `Reminder: ${flight} for booking ${ref} is about 5 hours from scheduled departure. Plan to be at the airport with required documents.`,
    },
    WEATHER_UPDATE: {
      subject: `Weather update · ${destination}`,
      intro: `Weather update for ${destination}.`,
      text:
        input.weatherSummary ??
        `A destination weather update is available for ${destination} (booking ${ref}).`,
    },
    FLIGHT_STATUS_CHANGE: {
      subject: `Flight status notice · ${ref}`,
      intro: "A flight-status notice is available.",
      text: `A flight-status change notice was prepared for ${flight} (booking ${ref}). Verify the latest status with the airline when live status is unavailable.`,
    },
  };

  const selected = content[input.template];
  const html = `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#102a43;line-height:1.5">
  <h1 style="font-size:22px;margin:0 0 12px">GB International Travel</h1>
  <p style="margin:0 0 12px">${escapeHtml(selected.intro)}</p>
  <p style="margin:0 0 12px">${escapeHtml(selected.text)}</p>
  <p style="margin:0;color:#627d98;font-size:13px">Booking reference: ${escapeHtml(ref)}</p>
  <p style="margin:16px 0 0;color:#627d98;font-size:12px">This message never includes passport or payment card details.</p>
</body></html>`;

  return {
    subject: selected.subject,
    text: selected.text,
    html,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
