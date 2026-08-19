"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function MarkNotificationReadButton({
  notificationId,
  unread,
}: {
  notificationId: string;
  unread: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(!unread);

  if (done) {
    return (
      <span className="text-xs text-[var(--color-muted)]">Read</span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-medium text-[var(--color-brand)] disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          const res = await fetch("/api/account/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: notificationId }),
          });
          if (res.ok) {
            setDone(true);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "Saving…" : "Mark as read"}
    </button>
  );
}

export function MarkAllNotificationsReadButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      className="inline-flex h-10 items-center rounded-md border border-[var(--color-border)] px-3 text-sm font-medium disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/account/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          });
          router.refresh();
        });
      }}
    >
      {pending ? "Updating…" : "Mark all as read"}
    </button>
  );
}
