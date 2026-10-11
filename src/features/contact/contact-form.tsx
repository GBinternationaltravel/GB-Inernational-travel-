"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { mailtoHref, whatsappHref } from "@/lib/contact-links";

type Channel = "whatsapp" | "email";

const fieldClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

function buildMessage(data: FormData): { subject: string; body: string } {
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const name = value("name");
  const reference = value("reference");
  const details = [
    `Name: ${name}`,
    value("email") ? `Email: ${value("email")}` : "",
    value("phone") ? `Phone: ${value("phone")}` : "",
    reference ? `Booking reference: ${reference}` : "",
  ].filter(Boolean);

  return {
    subject: reference
      ? `Enquiry about booking ${reference}`
      : `Website enquiry from ${name || "a customer"}`,
    body: `Hello ${siteConfig.name},\n\n${value("message")}\n\n${details.join("\n")}`,
  };
}

/**
 * Contact form with no server submission: it opens WhatsApp or the visitor's
 * email app with the message already filled in, ready to send.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Channel | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const channel: Channel = submitter?.value === "email" ? "email" : "whatsapp";
    const { subject, body } = buildMessage(new FormData(event.currentTarget));

    if (channel === "whatsapp") {
      window.open(whatsappHref(siteConfig.contactWhatsApp, body), "_blank", "noopener,noreferrer");
    } else {
      window.location.href = mailtoHref(siteConfig.contactEmail, { subject, body });
    }
    setStatus(channel);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-[var(--color-ink)]">
          Name
          <input name="name" required autoComplete="name" className={fieldClass} placeholder="Your name" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-[var(--color-ink)]">
          <span>
            Phone <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            placeholder="+92 3XX XXXXXXX"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-[var(--color-ink)]">
          <span>
            Email <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-[var(--color-ink)]">
          <span>
            Booking reference <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </span>
          <input name="reference" className={fieldClass} placeholder="If you have one" />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-[var(--color-ink)]">
        Message
        <textarea
          name="message"
          required
          className={`${fieldClass} min-h-36 py-2`}
          placeholder="How can we help? For flights, include your route, dates and number of passengers."
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          value="whatsapp"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-emerald-dark)] focus-visible:ring-2 focus-visible:ring-[var(--color-emerald)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Send on WhatsApp
        </button>
        <button
          type="submit"
          value="email"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Send by email
        </button>
      </div>

      <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
        {status === "whatsapp"
          ? "WhatsApp has opened in a new tab with your message. Press send in WhatsApp to reach us."
          : status === "email"
            ? `Your email app should open with your message to ${siteConfig.contactEmail}. Press send to reach us.`
            : "This form does not send anything from the website. It opens WhatsApp or your email app with your message filled in, so you can check it and press send."}
      </p>
    </form>
  );
}
