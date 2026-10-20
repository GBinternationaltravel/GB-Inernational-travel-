"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";
import { callbackRequestSchema } from "@/lib/validations/callback-request";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CallbackForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = callbackRequestSchema.safeParse({ name, phone, message, companyWebsite });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/callback-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setFormError(result.message ?? "Please call or WhatsApp us instead.");
        return;
      }
      setDone(true);
    } catch {
      setFormError("Please call or WhatsApp us instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const text = `Hi ${siteConfig.name}, please call me back. My name is ${name}. ${message}`;
    return (
      <Alert variant="success" title="Request received">
        <p>We have your number. This is not a booking. You can also reach us now:</p>
        <p className="mt-2">
          <a href={whatsappHref(siteConfig.contactWhatsApp, text)} className="font-medium underline">
            {siteConfig.contactWhatsAppLabel} {siteConfig.contactWhatsApp}
          </a>
          {" · "}
          <a href={telHref(siteConfig.contactPhone)} className="font-medium underline">
            {siteConfig.contactPhoneLabel} {siteConfig.contactPhone}
          </a>
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      <Input label="Your name" name="callback-name" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} autoComplete="name" />
      <Input label="Phone" name="callback-phone" value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} autoComplete="tel" />
      <label className="block text-sm">
        <span className="font-medium">Message (optional)</span>
        <textarea
          name="callback-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-1.5 min-h-24 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
        />
      </label>
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
        <label>
          Company website
          <input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} />
        </label>
      </div>
      <Button type="submit" className="h-11" isLoading={submitting}>
        Ask for a call
      </Button>
    </form>
  );
}
