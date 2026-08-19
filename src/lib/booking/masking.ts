export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***${digits.slice(-4)}`;
}

export function maskPassport(passportNumber: string): string {
  const cleaned = passportNumber.replace(/\s/g, "");
  if (cleaned.length < 4) return "****";
  return `****${cleaned.slice(-4)}`;
}

/** Redact sensitive fields before logging. */
export function redactForLogs<T extends Record<string, unknown>>(payload: T): T {
  const clone = structuredClone(payload);
  const sensitive = [
    "passportNumber",
    "passport",
    "password",
    "accessToken",
    "access_token",
    "client_secret",
    "clientSecret",
    "cardNumber",
    "cvv",
    "secret",
    "apiKey",
    "webhookSecret",
    "authorization",
    "docNumber",
    "travelDocument",
  ];

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (sensitive.some((item) => key.toLowerCase().includes(item.toLowerCase()))) {
        record[key] = "[REDACTED]";
      } else {
        walk(record[key]);
      }
    }
  }

  walk(clone);
  return clone;
}
