"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_OPTIONS = [
  "CUSTOMER",
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TICKET_ISSUER",
  "ACCOUNTANT",
  "SUPPORT",
  "STAFF",
  "AGENT",
] as const;

export function CustomerRoleForm({
  customerId,
  currentRole,
}: {
  customerId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; role?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update role.");
        return;
      }
      setMessage(`Role updated to ${data.role ?? role}.`);
      router.refresh();
    } catch {
      setError("Could not update role.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
      <h3 className="text-sm font-medium">Change role</h3>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || role === currentRole}
        className="h-9 rounded-md bg-[var(--color-brand)] px-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update role"}
      </button>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
