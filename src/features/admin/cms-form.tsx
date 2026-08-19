"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Field =
  | {
      name: string;
      label: string;
      type?: "text" | "url" | "email" | "number" | "date" | "datetime-local";
      defaultValue?: string | number | null;
      required?: boolean;
      placeholder?: string;
      step?: string;
    }
  | {
      name: string;
      label: string;
      type: "textarea";
      defaultValue?: string | null;
      required?: boolean;
      rows?: number;
      placeholder?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      defaultValue?: string | boolean | null;
      required?: boolean;
      options: Array<{ value: string; label: string }>;
    }
  | {
      name: string;
      label: string;
      type: "checkbox";
      defaultChecked?: boolean;
    };

export function CmsEntityForm({
  title,
  endpoint,
  method = "POST",
  fields,
  submitLabel = "Save",
  extraPayload,
  onSuccess,
  children,
}: {
  title: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  fields: Field[];
  submitLabel?: string;
  extraPayload?: Record<string, unknown>;
  onSuccess?: () => void;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { ...(extraPayload ?? {}) };

    for (const field of fields) {
      if (field.type === "checkbox") {
        payload[field.name] = form.get(field.name) === "on";
        continue;
      }
      const raw = form.get(field.name);
      const value = typeof raw === "string" ? raw : "";
      if (field.type === "number") {
        payload[field.name] = value === "" ? null : Number(value);
      } else if (field.type === "select" && (value === "true" || value === "false")) {
        payload[field.name] = value === "true";
      } else {
        payload[field.name] = value;
      }
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        setBusy(false);
        return;
      }
      setOk("Saved.");
      onSuccess?.();
      router.refresh();
      if (method === "POST") {
        event.currentTarget.reset();
      }
    } catch {
      setError("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-4"
    >
      <h2 className="font-display text-xl">{title}</h2>
      {children}
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "textarea") {
            return (
              <label key={field.name} className="block space-y-1 md:col-span-2 text-sm">
                <span>{field.label}</span>
                <textarea
                  name={field.name}
                  required={field.required}
                  rows={field.rows ?? 4}
                  defaultValue={field.defaultValue ?? ""}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
                />
              </label>
            );
          }
          if (field.type === "select") {
            return (
              <label key={field.name} className="block space-y-1 text-sm">
                <span>{field.label}</span>
                <select
                  name={field.name}
                  required={field.required}
                  defaultValue={
                    field.defaultValue === true
                      ? "true"
                      : field.defaultValue === false
                        ? "false"
                        : (field.defaultValue ?? "")
                  }
                  className="h-10 w-full rounded-md border border-[var(--color-border)] px-3"
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (field.type === "checkbox") {
            return (
              <label
                key={field.name}
                className="flex items-center gap-2 text-sm md:col-span-2"
              >
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={field.defaultChecked}
                  className="h-4 w-4"
                />
                <span>{field.label}</span>
              </label>
            );
          }
          return (
            <label key={field.name} className="block space-y-1 text-sm">
              <span>{field.label}</span>
              <input
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                defaultValue={field.defaultValue ?? ""}
                placeholder={field.placeholder}
                step={field.step}
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-3"
              />
            </label>
          );
        })}
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">{ok}</Alert> : null}
    </form>
  );
}

export function CmsToggleButton({
  endpoint,
  payload,
  label,
  variant = "secondary",
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Action failed.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button type="button" size="sm" variant={variant} disabled={busy} onClick={() => void run()}>
        {busy ? "…" : label}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
