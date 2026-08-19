"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { countries } from "@/data/countries";
import { getAuthFieldErrors, profileUpdateSchema } from "@/lib/validations/auth";

type ProfileValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  preferredCurrency: string;
  preferredLanguage: string;
  emailNotificationsOptIn: boolean;
  travelRemindersOptIn: boolean;
  weatherUpdatesOptIn: boolean;
  flightStatusAlertsOptIn: boolean;
};

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const parsed = profileUpdateSchema.safeParse({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      phoneCountryCode: values.phoneCountryCode,
      preferredCurrency: values.preferredCurrency,
      preferredLanguage: values.preferredLanguage,
      emailNotificationsOptIn: values.emailNotificationsOptIn,
      travelRemindersOptIn: values.travelRemindersOptIn,
      weatherUpdatesOptIn: values.weatherUpdatesOptIn,
      flightStatusAlertsOptIn: values.flightStatusAlertsOptIn,
    });
    if (!parsed.success) {
      setErrors(getAuthFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (!response.ok) {
        setErrors(data.fields ?? {});
        setError(data.error ?? "We couldn't update your profile.");
        return;
      }
      setMessage("Profile and notification preferences updated.");
      router.refresh();
    } catch {
      setError("We couldn't update your profile right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4" noValidate>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input label="Email" value={values.email} disabled hint="Email changes are not enabled yet." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          value={values.firstName}
          onChange={(event) => update("firstName", event.target.value)}
          error={errors.firstName}
        />
        <Input
          label="Last name"
          value={values.lastName}
          onChange={(event) => update("lastName", event.target.value)}
          error={errors.lastName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Country calling code"
          options={countries.map((country) => ({
            value: country.dialCode,
            label: `${country.name} (${country.dialCode})`,
          }))}
          value={values.phoneCountryCode}
          onChange={(event) => update("phoneCountryCode", event.target.value)}
          error={errors.phoneCountryCode}
        />
        <Input
          label="Phone"
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
          error={errors.phone}
        />
      </div>
      <Select
        label="Preferred currency"
        options={[
          { value: "PKR", label: "PKR" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
          { value: "AED", label: "AED" },
        ]}
        value={values.preferredCurrency}
        onChange={(event) => update("preferredCurrency", event.target.value)}
        error={errors.preferredCurrency}
      />
      <Select
        label="Preferred language"
        options={[
          { value: "en", label: "English" },
          { value: "ur", label: "Urdu" },
          { value: "ar", label: "Arabic" },
        ]}
        value={values.preferredLanguage}
        onChange={(event) => update("preferredLanguage", event.target.value)}
        error={errors.preferredLanguage}
      />

      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-1 font-display text-lg">Notification preferences</legend>
        <p className="text-sm text-[var(--color-muted)]">
          These settings are stored on your account. SMS and WhatsApp are not available yet.
        </p>
        <PreferenceToggle
          label="Email notifications"
          checked={values.emailNotificationsOptIn}
          onChange={(checked) => update("emailNotificationsOptIn", checked)}
          hint="Master switch for email delivery to this account."
        />
        <PreferenceToggle
          label="Travel reminders"
          checked={values.travelRemindersOptIn}
          onChange={(checked) => update("travelRemindersOptIn", checked)}
          hint="24-hour departure and 5-hour boarding reminders."
        />
        <PreferenceToggle
          label="Weather updates"
          checked={values.weatherUpdatesOptIn}
          onChange={(checked) => update("weatherUpdatesOptIn", checked)}
          hint="Destination weather emails around departure."
        />
        <PreferenceToggle
          label="Flight status alerts"
          checked={values.flightStatusAlertsOptIn}
          onChange={(checked) => update("flightStatusAlertsOptIn", checked)}
          hint="Prepared for future flight-status notices (API not connected yet)."
        />
      </fieldset>

      <Button type="submit" isLoading={loading}>
        Save profile
      </Button>
    </form>
  );
}

function PreferenceToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 block text-[var(--color-muted)]">{hint}</span>
      </span>
    </label>
  );
}
