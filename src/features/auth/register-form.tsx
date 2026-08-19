"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { countries } from "@/data/countries";
import { getAuthFieldErrors, registerSchema } from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCountryCode: "+92",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(getAuthFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (!response.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "We couldn't create your account.");
        return;
      }

      const signedIn = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (signedIn?.error) {
        router.push("/login");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setFormError("We couldn't create your account right now.");
    } finally {
      setLoading(false);
    }
  }

  const dialOptions = countries.map((country) => ({
    value: country.dialCode,
    label: `${country.name} (${country.dialCode})`,
  }));

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          value={values.firstName}
          onChange={(event) => update("firstName", event.target.value)}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <Input
          label="Last name"
          value={values.lastName}
          onChange={(event) => update("lastName", event.target.value)}
          error={errors.lastName}
          autoComplete="family-name"
        />
      </div>
      <Input
        label="Email"
        type="email"
        value={values.email}
        onChange={(event) => update("email", event.target.value)}
        error={errors.email}
        autoComplete="email"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Country calling code"
          options={dialOptions}
          value={values.phoneCountryCode}
          onChange={(event) => update("phoneCountryCode", event.target.value)}
          error={errors.phoneCountryCode}
        />
        <Input
          label="Phone"
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
          error={errors.phone}
          autoComplete="tel"
        />
      </div>
      <Input
        label="Password"
        type="password"
        value={values.password}
        onChange={(event) => update("password", event.target.value)}
        error={errors.password}
        autoComplete="new-password"
        hint="At least 8 characters"
      />
      <Input
        label="Confirm password"
        type="password"
        value={values.confirmPassword}
        onChange={(event) => update("confirmPassword", event.target.value)}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />
      <Button type="submit" size="lg" className="w-full" isLoading={loading}>
        Create Account
      </Button>
      <p className="text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-brand)]">
          Login
        </Link>
      </p>
    </form>
  );
}
