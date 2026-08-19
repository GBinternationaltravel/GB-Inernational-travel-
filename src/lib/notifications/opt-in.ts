import { getUserRepository } from "@/lib/auth/get-user-repository";

export type NotificationPreferenceKey =
  | "emailNotificationsOptIn"
  | "travelRemindersOptIn"
  | "weatherUpdatesOptIn"
  | "flightStatusAlertsOptIn";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  emailNotificationsOptIn: true,
  travelRemindersOptIn: true,
  weatherUpdatesOptIn: false,
  flightStatusAlertsOptIn: false,
};

export function normalizeNotificationPreferences(
  input?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  return {
    emailNotificationsOptIn:
      input?.emailNotificationsOptIn ??
      defaultNotificationPreferences.emailNotificationsOptIn,
    travelRemindersOptIn:
      input?.travelRemindersOptIn ??
      defaultNotificationPreferences.travelRemindersOptIn,
    weatherUpdatesOptIn:
      input?.weatherUpdatesOptIn ??
      defaultNotificationPreferences.weatherUpdatesOptIn,
    flightStatusAlertsOptIn:
      input?.flightStatusAlertsOptIn ??
      defaultNotificationPreferences.flightStatusAlertsOptIn,
  };
}

/**
 * Preference checks for outbound travel emails.
 * Transactional payment/ticketing still require the master email switch.
 */
export function canSendByPreference(
  prefs: NotificationPreferences,
  kind:
    | "TRANSACTIONAL"
    | "TRAVEL_REMINDER"
    | "WEATHER_UPDATE"
    | "FLIGHT_STATUS",
): boolean {
  if (!prefs.emailNotificationsOptIn) return false;
  if (kind === "TRANSACTIONAL") return true;
  if (kind === "TRAVEL_REMINDER") return prefs.travelRemindersOptIn;
  if (kind === "WEATHER_UPDATE") return prefs.weatherUpdatesOptIn;
  return prefs.flightStatusAlertsOptIn;
}

export async function getUserNotificationPreferences(
  userId?: string | null,
): Promise<NotificationPreferences> {
  if (process.env.ALLOW_OPTIONAL_EMAILS_WITHOUT_OPT_IN === "true") {
    return {
      emailNotificationsOptIn: true,
      travelRemindersOptIn: true,
      weatherUpdatesOptIn: true,
      flightStatusAlertsOptIn: true,
    };
  }
  if (!userId) {
    return {
      ...defaultNotificationPreferences,
      // Guests: transactional OK via booking contact; optional channels off.
      weatherUpdatesOptIn: false,
      flightStatusAlertsOptIn: false,
      travelRemindersOptIn: true,
    };
  }

  try {
    const { repo } = await getUserRepository();
    const user = await repo.findById(userId);
    return normalizeNotificationPreferences(user ?? undefined);
  } catch {
    return defaultNotificationPreferences;
  }
}

/** @deprecated Prefer getUserNotificationPreferences + canSendByPreference */
export async function userAllowsOptionalEmails(
  userId?: string | null,
): Promise<boolean> {
  const prefs = await getUserNotificationPreferences(userId);
  return canSendByPreference(prefs, "WEATHER_UPDATE");
}
