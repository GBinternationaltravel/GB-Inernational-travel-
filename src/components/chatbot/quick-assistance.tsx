"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { siteConfig } from "@/config/site";

const DISMISS_KEY = "gb-qa-dismissed";
const AUTO_OPEN_MS = 2200;

type PanelView = "menu" | "agent";

const QUICK_OPTIONS = [
  { emoji: "✈️", label: "Flight / Ticket Help", href: "/flights" },
  { emoji: "🏔️", label: "Tours & Packages", href: "/tours" },
  { emoji: "🛂", label: "Visa Information", href: "/visa" },
  { emoji: "🎫", label: "Booking Help", href: "/my-trips" },
] as const;

function whatsappHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function telHref(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

export function QuickAssistance() {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("menu");

  useEffect(() => {
    setMounted(true);
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => setOpen(true), AUTO_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    setView("menu");
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore private mode */
    }
  }

  function openPanel() {
    setOpen(true);
  }

  if (!mounted) return null;

  const emailHref = `mailto:${siteConfig.contactEmail}`;
  const phoneHref = telHref(siteConfig.contactPhone);
  const whatsappUrl = whatsappHref(siteConfig.contactWhatsApp);

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      <div
        className={`pointer-events-auto w-[min(100vw-1.5rem,20.5rem)] origin-bottom-right overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-elevated)] transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none absolute translate-y-2 scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-hidden={!open}
        hidden={!open}
      >
        <div className="flex items-start justify-between gap-3 bg-[var(--color-navy)] px-3.5 py-3 text-white">
          <div className="min-w-0">
            <p id={titleId} className="text-sm font-semibold tracking-tight">
              Quick Assistance
            </p>
            <p className="mt-0.5 text-xs text-white/70">{siteConfig.name}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimize Quick Assistance"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-3.5">
          {view === "menu" ? (
            <>
              <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                👋 Welcome to {siteConfig.name}!
                <br />
                How can we help you today?
              </p>
              <ul className="mt-3 space-y-2">
                {QUICK_OPTIONS.map((option) => (
                  <li key={option.href}>
                    <Link
                      href={option.href}
                      className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:border-[var(--color-sky)]/40 hover:bg-white"
                      onClick={dismiss}
                    >
                      <span aria-hidden className="text-base leading-none">
                        {option.emoji}
                      </span>
                      <span>{option.label}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-navy)] transition-colors hover:border-[var(--color-emerald)]/40 hover:bg-white"
                    onClick={() => setView("agent")}
                  >
                    <span aria-hidden className="text-base leading-none">
                      👨‍💼
                    </span>
                    <span>Talk to a Live Agent</span>
                  </button>
                </li>
              </ul>
            </>
          ) : (
            <>
              <button
                type="button"
                className="mb-2 text-xs font-semibold text-[var(--color-sky)] transition-colors hover:text-[var(--color-sky-dark)]"
                onClick={() => setView("menu")}
              >
                ← Back to options
              </button>
              <p className="text-sm text-[var(--color-ink)]">
                Reach our team via WhatsApp, call, or email.
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={whatsappUrl}
                    className="flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-surface)]"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={dismiss}
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={phoneHref}
                    className="flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-surface)]"
                    onClick={dismiss}
                  >
                    Call
                  </a>
                </li>
                <li>
                  <a
                    href={emailHref}
                    className="flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-surface)]"
                    onClick={dismiss}
                  >
                    Email
                  </a>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-emerald)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-elevated)] transition-[background-color,transform] duration-150 hover:bg-[var(--color-emerald-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sky)] focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-label={open ? "Minimize Quick Assistance" : "Open Quick Assistance"}
        onClick={() => (open ? dismiss() : openPanel())}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        Quick Assistance
      </button>
    </div>
  );
}
