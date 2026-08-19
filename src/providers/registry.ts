import type { FlightProvider } from "@/providers/flights/types";
import type { WeatherProvider } from "@/providers/weather/types";
import type {
  ChannelNotificationRouter,
  NotificationProvider,
} from "@/providers/notifications/types";
import type { PaymentProvider } from "@/providers/payments/types";
import type { FlightSupplier } from "@/providers/flights/supplier-types";
import type { FlightStatusProvider } from "@/providers/flight-status/types";
import { MockFlightProvider, MockFlightSupplier } from "@/providers/flights/mock-flight-supplier";
import { TravelportFlightSupplier } from "@/providers/flights/travelport-flight-supplier";
import { MockWeatherProvider } from "@/providers/weather/mock-weather-provider";
import { OpenWeatherMapProvider } from "@/providers/weather/openweather-provider";
import { ConsoleNotificationProvider } from "@/providers/notifications/console-notification-provider";
import { ResendEmailProvider } from "@/providers/notifications/resend-email-provider";
import { MultiChannelNotificationRouter } from "@/providers/notifications/multi-channel-router";
import { MockFlightStatusProvider } from "@/providers/flight-status/mock-flight-status-provider";
import { CommercialFlightStatusProvider } from "@/providers/flight-status/commercial-flight-status-provider";
import { AviationStackFlightStatusProvider } from "@/providers/flight-status/aviationstack-flight-status-provider";
import { MockPaymentProvider } from "@/providers/payments/mock-payment-provider";
import { SafepayPaymentProvider } from "@/providers/payments/safepay-payment-provider";
import { getPaymentEnv } from "@/config/payment";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { getWeatherEnv } from "@/config/weather";
import { getNotificationEnv } from "@/config/notifications";
import { getFlightStatusEnv } from "@/config/flight-status";

/**
 * Provider registry — swap implementations without touching the frontend.
 */
let flightProvider: FlightProvider | null = null;
let flightSupplier: FlightSupplier | null = null;
let weatherProvider: WeatherProvider | null = null;
let notificationProvider: NotificationProvider | null = null;
let notificationRouter: ChannelNotificationRouter | null = null;
let flightStatusProvider: FlightStatusProvider | null = null;
let paymentProvider: PaymentProvider | null = null;

export function getFlightSupplier(): FlightSupplier {
  if (!flightSupplier) {
    const env = getFlightSupplierEnv();
    if (env.activeSupplier === "travelport") {
      if (env.travelport.hasCredentials) {
        flightSupplier = new TravelportFlightSupplier();
      } else if (env.travelport.allowMockFallback && !env.travelport.requireTravelport) {
        flightSupplier = new MockFlightSupplier();
      } else {
        flightSupplier = new TravelportFlightSupplier();
      }
    } else {
      flightSupplier = new MockFlightSupplier();
    }
  }
  return flightSupplier;
}

export function getFlightProvider(): FlightProvider {
  if (!flightProvider) {
    flightProvider = new MockFlightProvider();
  }
  return flightProvider;
}

export function getWeatherProvider(): WeatherProvider {
  if (!weatherProvider) {
    const env = getWeatherEnv();
    weatherProvider = env.useLive
      ? new OpenWeatherMapProvider()
      : new MockWeatherProvider();
  }
  return weatherProvider;
}

export function getNotificationProvider(): NotificationProvider {
  if (!notificationProvider) {
    const env = getNotificationEnv();
    notificationProvider = env.useLive
      ? new ResendEmailProvider()
      : new ConsoleNotificationProvider();
  }
  return notificationProvider;
}

export function getNotificationRouter(): ChannelNotificationRouter {
  if (!notificationRouter) {
    notificationRouter = new MultiChannelNotificationRouter();
  }
  return notificationRouter;
}

export function getFlightStatusProvider(): FlightStatusProvider {
  if (!flightStatusProvider) {
    const env = getFlightStatusEnv();
    if (env.useLive) {
      flightStatusProvider = new AviationStackFlightStatusProvider();
    } else if (env.notConfigured || env.configuredMode === "aviationstack") {
      // Selected commercial provider without credentials — never invent live status.
      flightStatusProvider = new CommercialFlightStatusProvider();
    } else {
      flightStatusProvider = new MockFlightStatusProvider();
    }
  }
  return flightStatusProvider;
}

export function getPaymentProvider(): PaymentProvider {
  if (!paymentProvider) {
    const env = getPaymentEnv();
    paymentProvider =
      env.activeProvider === "SAFEPAY" && env.safepayAllowed
        ? new SafepayPaymentProvider()
        : new MockPaymentProvider();
  }
  return paymentProvider;
}

export function getPaymentProviderByCode(code: string): PaymentProvider {
  if (code === "SAFEPAY") {
    const env = getPaymentEnv();
    if (!env.safepayAllowed) {
      return new MockPaymentProvider();
    }
    return new SafepayPaymentProvider();
  }
  return new MockPaymentProvider();
}

export function setFlightSupplier(supplier: FlightSupplier): void {
  flightSupplier = supplier;
}

export function setFlightProvider(provider: FlightProvider): void {
  flightProvider = provider;
}

export function setWeatherProvider(provider: WeatherProvider): void {
  weatherProvider = provider;
}

export function setNotificationProvider(provider: NotificationProvider): void {
  notificationProvider = provider;
}

export function setNotificationRouter(router: ChannelNotificationRouter): void {
  notificationRouter = router;
}

export function setFlightStatusProvider(provider: FlightStatusProvider): void {
  flightStatusProvider = provider;
}

export function setPaymentProvider(provider: PaymentProvider): void {
  paymentProvider = provider;
}
