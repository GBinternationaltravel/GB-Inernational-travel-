import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  IdCard,
  Luggage,
  Radar,
  Ticket,
  type LucideIcon,
} from "lucide-react";

type DetailItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Hedged, generic guidance. Airlines and authorities have the final word. */
  text?: string;
  links?: { href: string; label: string }[];
  /** A plain link instead of an expandable detail. */
  href?: string;
};

const details: DetailItem[] = [
  {
    id: "check-in",
    icon: Clock3,
    label: "Check-in",
    text: "Domestic check-in usually closes 30–45 minutes before departure, and international check-in 60–90 minutes before. Times vary by airline and airport, so check with your airline and plan to arrive about 2 hours early for domestic flights and 3 hours early for international flights.",
    links: [{ href: "/faq", label: "Read our FAQs" }],
  },
  {
    id: "baggage",
    icon: Luggage,
    label: "Baggage",
    text: "Baggage allowance depends on the airline and the fare you choose. Where our published fare includes a baggage figure, it is shown on that result. If it is not shown, ask us or the airline before you travel.",
    links: [{ href: "/travel-guides", label: "Travel guides" }],
  },
  {
    id: "documents",
    icon: IdCard,
    label: "Documents",
    text: "Domestic flights: carry your original CNIC (airlines set their own rules for children and foreign nationals). International flights: a valid passport, a visa where required, and any Protector of Emigrants or Umrah requirements that apply to your trip. Rules change, so confirm with your airline and the relevant authority before you travel.",
    links: [
      { href: "/visa", label: "Visa guides" },
      { href: "/travel-guides", label: "Travel guides" },
    ],
  },
  {
    id: "e-ticket",
    icon: Ticket,
    label: "E-ticket & reminders",
    text: "Our team issues your e-ticket and airline PNR manually after we confirm the flight and receive the agreed payment. A booking request is not a ticket. We send the e-ticket by the contact details you give us. Reminder messages are a courtesy and may not cover every departure.",
    links: [{ href: "/contact", label: "Contact the team" }],
  },
  {
    id: "flight-status",
    icon: Radar,
    label: "Flight status",
    href: "/flight-status",
  },
];

/**
 * Travel details under the hero search.
 * Native <details> so the guidance is in the server HTML, not only after a click handler runs.
 */
export function HomeTravelDetails() {
  return (
    <div className="mt-4 border-t border-[#efe9df] pt-3.5 lg:mt-5">
      <h2 className="mb-2 text-[0.625rem] font-semibold tracking-[0.18em] text-[#8b6e3e] uppercase">
        Travel details
      </h2>
      <div className="flex flex-col gap-2">
        {details.map((item) => {
          const Icon = item.icon;
          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-[#ece6db] px-3 text-[0.8125rem] font-medium text-[var(--color-navy)] hover:bg-[#f7f2e9]"
              >
                <Icon className="h-4 w-4 text-[#b08d57]" strokeWidth={1.4} aria-hidden />
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-[#8b6e3e]" aria-hidden />
              </Link>
            );
          }
          return (
            <details key={item.id} className="rounded-2xl border border-[#ece6db] bg-white px-3 py-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[0.8125rem] font-medium text-[var(--color-navy)] [&::-webkit-details-marker]:hidden">
                <Icon className="h-4 w-4 text-[#b08d57]" strokeWidth={1.4} aria-hidden />
                {item.label}
              </summary>
              <div className="px-1 pt-1 pb-2">
                <p className="max-w-3xl text-sm leading-relaxed text-[#4b5563]">{item.text}</p>
                {item.links ? (
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {item.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-navy)] underline decoration-[#c9a96e] decoration-1 underline-offset-4 hover:text-[#8b6e3e]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
