import { randomBytes, createHash, timingSafeEqual } from "crypto";

/** Customer-facing booking reference, e.g. GB7K42M9 — no PII, not a DB id. */
export function generateBookingReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let body = "";
  for (let i = 0; i < 8; i += 1) {
    body += alphabet[bytes[i]! % alphabet.length];
  }
  return `GB${body}`;
}

export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string, hash: string): boolean {
  const tokenHash = hashAccessToken(token);
  const a = Buffer.from(tokenHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
