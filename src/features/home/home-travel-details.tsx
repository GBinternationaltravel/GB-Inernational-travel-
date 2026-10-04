"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  IdCard,
  Luggage,
  Radar,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    text: "Baggage allowance depends on the airline and the fare you choose. Each flight result shows the included baggage before you book. Check the airline's rules for hand luggage and extra bags.",
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
    text: "Our team issues your e-ticket and airline PNR once your booking is confirmed, and you can view your trip in My Trips. We also send reminders 24 hours, 5 hours and 3 hours before departure.",
    links: [{ href: "/my-trips", label: "My Trips" }],
  },
  {
    id: "flight-status",
    icon: Radar,
    label: "Flight status",
    href: "/flight-status",
  },
];

/** Compact "Travel details" row under the hero flight search: progressive disclosure, no claims. */
export function HomeTravelDetails() {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && openId) {
      document.getElementById(`${baseId}-btn-${openId}`)?.focus();
      setOpenId(null);
    }
  }

  return (
    <div className="mt-4 border-t border-[#efe9df] pt-3.5 lg:mt-5" onKeyDown={onKeyDown}>
      <h2 className="mb-2 text-[0.625rem] font-semibold tracking-[0.18em] text-[#8b6e3e] uppercase sm:sr-only">
        Travel details
      </h2>
      <div className="-mx-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-x-1 sm:gap-y-1.5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <p
          aria-hidden
          className="mr-3 hidden text-[0.625rem] font-semibold tracking-[0.18em] text-[#8b6e3e] uppercase sm:block"
        >
          Travel details
        </p>
        {details.map((item) => {
          const Icon = item.icon;
          const itemClasses =
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#ece6db] px-3 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--color-navy)] transition-colors hover:bg-[#f7f2e9] sm:border-transparent";
          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={itemClasses}>
                <Icon className="h-4 w-4 text-[#b08d57]" strokeWidth={1.4} aria-hidden />
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-[#8b6e3e]" aria-hidden />
              </Link>
            );
          }
          const open = openId === item.id;
          return (
            <button
              key={item.id}
              id={`${baseId}-btn-${item.id}`}
              type="button"
              aria-expanded={open}
              aria-controls={`${baseId}-panel-${item.id}`}
              onClick={() => setOpenId(open ? null : item.id)}
              className={cn(itemClasses, open && "bg-[#f4efe6]")}
            >
              <Icon className="h-4 w-4 text-[#b08d57]" strokeWidth={1.4} aria-hidden />
              {item.label}
              <ChevronDown
                className={cn("h-3.5 w-3.5 text-[#8b6e3e] transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {details
        .filter((item) => item.text)
        .map((item) => (
          <div
            key={item.id}
            id={`${baseId}-panel-${item.id}`}
            role="region"
            aria-labelledby={`${baseId}-btn-${item.id}`}
            hidden={openId !== item.id}
            className="mt-3 rounded-2xl bg-[#faf7f1] px-4 py-4 sm:px-5"
          >
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
        ))}
    </div>
  );
}
