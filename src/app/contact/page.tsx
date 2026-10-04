import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/features/contact/contact-form";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Contact GB International Travel by phone, WhatsApp or email for flight bookings, tours and visa services from Pakistan.",
  path: "/contact",
});

const channels = [
  {
    icon: Phone,
    label: "Phone",
    value: siteConfig.contactPhone,
    href: telHref(),
    note: "Call us about bookings, tickets and travel plans.",
    external: false,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: siteConfig.contactWhatsApp,
    href: whatsappHref(),
    note: "Chat with our team or send documents on WhatsApp.",
    external: true,
  },
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contactEmail,
    href: mailtoHref(),
    note: "Email us for quotes, booking changes and refunds.",
    external: false,
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Us"
        description="Questions about a flight, tour or visa? Call, WhatsApp or email our team and we will help you plan your trip."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
      />
      <Section>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-emerald)_10%,white)] text-[var(--color-emerald)]">
                  <channel.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold tracking-[0.12em] text-[var(--color-muted-soft)] uppercase">
                    {channel.label}
                  </span>
                  <span className="mt-0.5 block text-lg font-semibold break-words text-[var(--color-navy)]">
                    {channel.value}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--color-muted)]">{channel.note}</span>
                </span>
              </a>
            ))}

            <Card>
              <h2 className="text-base font-semibold text-[var(--color-navy)]">Booking help</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-muted)] marker:text-[var(--color-emerald)]">
                <li>Please have your booking reference ready when you contact us.</li>
                <li>
                  Tickets are issued manually. After your booking request, our team books with the
                  airline and sends you your e-ticket and PNR.
                </li>
                <li>
                  A booking request or payment is not a confirmed ticket until your e-ticket has been
                  issued.
                </li>
              </ul>
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                See our{" "}
                <Link href="/cancellation-policy" className="font-medium text-[var(--color-brand)] hover:underline">
                  Cancellation Policy
                </Link>{" "}
                and{" "}
                <Link href="/refund-policy" className="font-medium text-[var(--color-brand)] hover:underline">
                  Refund Policy
                </Link>
                .
              </p>
            </Card>
          </div>

          <Card className="p-6 sm:p-8 lg:col-span-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-navy)]">
              Send us a message
            </h2>
            <p className="mt-2 mb-6 text-sm text-[var(--color-muted)]">
              Write your message below, then choose WhatsApp or email to send it to our team.
            </p>
            <ContactForm />
          </Card>
        </div>
      </Section>
    </>
  );
}
