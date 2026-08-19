"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, Plane, X } from "lucide-react";
import { navigation, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && Boolean(session?.user);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--color-navy)]/95 text-white backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4 lg:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-emerald)]">
            <Plane className="h-4.5 w-4.5 text-white" aria-hidden />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {siteConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <>
              {session?.user?.role && session.user.role !== "CUSTOMER" ? (
                <Link href="/admin" className="text-sm text-white/80 hover:text-white">
                  Admin
                </Link>
              ) : null}
              <Link href="/my-trips" className="text-sm text-white/80 hover:text-white">
                My Trips
              </Link>
              <Link href="/account" className="text-sm text-white/80 hover:text-white">
                Account
              </Link>
              <button
                type="button"
                className="text-sm text-white/80 hover:text-white"
                onClick={() => void signOut({ callbackUrl: "/" })}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-white/80 hover:text-white">
              Login
            </Link>
          )}
          <Link
            href="/flights"
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-emerald-dark)]"
          >
            Book a Flight
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-white/10 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <div
        className={cn(
          "border-t border-white/10 bg-[var(--color-navy)] lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <Container className="flex max-h-[min(80vh,32rem)] flex-col gap-1 overflow-y-auto py-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-white/90 hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-2 border-t border-white/10" />
          {isLoggedIn ? (
            <>
              {session?.user?.role && session.user.role !== "CUSTOMER" ? (
                <Link
                  href="/admin"
                  className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-white/90 hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/my-trips"
                className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-white/90 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                My Trips
              </Link>
              <Link
                href="/account"
                className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-white/90 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                Account
              </Link>
              <button
                type="button"
                className="rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/10"
                onClick={() => {
                  setOpen(false);
                  void signOut({ callbackUrl: "/" });
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-white/90 hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          )}
          <Link
            href="/flights"
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-3 py-3 text-center text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Book a Flight
          </Link>
        </Container>
      </div>
    </header>
  );
}
