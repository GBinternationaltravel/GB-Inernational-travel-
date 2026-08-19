"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu, Plane, X } from "lucide-react";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";
import { filterAdminNavForRole } from "@/lib/auth/admin-nav";
import type { AdminNavSection } from "@/config/admin";
import { cn } from "@/lib/utils";

const SECTION_ORDER: AdminNavSection[] = ["OPERATIONS", "TRAVEL", "MANAGEMENT"];

export function AdminShell({
  children,
  userName,
  userEmail,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => filterAdminNavForRole(userRole), [userRole]);
  const grouped = useMemo(() => {
    return SECTION_ORDER.map((section) => ({
      section,
      items: items.filter((item) => item.section === section),
    })).filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <div className="gb-admin-shell fixed inset-0 z-50 flex text-[var(--color-ink)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-[var(--color-navy)] text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-emerald)]">
            <Plane className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight tracking-tight">GB Operations</p>
            <p className="text-[10px] tracking-wide text-white/55 uppercase">
              {userRole.replaceAll("_", " ")}
            </p>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="h-[calc(100%-3.5rem)] overflow-y-auto p-3" aria-label="Admin">
          {grouped.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const exact = Boolean(item.exact);
                  const active = exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-[var(--color-emerald)] text-white"
                            : "text-white/75 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-[#f4f6fa]">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white px-4">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-navy)]">{userName}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-[var(--color-sky)]">
              Site
            </Link>
            <button
              type="button"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              onClick={() => void signOut({ callbackUrl: "/login" })}
            >
              Logout
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
