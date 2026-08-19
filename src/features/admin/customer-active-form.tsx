"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CustomerActiveForm({
  customerId,
  isActive,
}: {
  customerId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/active`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update account.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h2 className="font-display text-lg">Account actions</h2>
      <Alert variant="info">
        Disable / enable is supported. Password reset flow is prepared but not fully
        implemented. Account deletion is not available.
      </Alert>
      <Button type="button" variant={isActive ? "danger" : "primary"} disabled={busy} onClick={() => void toggle()}>
        {busy ? "Updating…" : isActive ? "Disable account" : "Enable account"}
      </Button>
      <p className="text-sm text-[var(--color-muted)]">
        Reset password: available in a later security phase. Passwords are never visible.
      </p>
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
