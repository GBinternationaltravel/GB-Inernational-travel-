/**
 * Environment configuration with safe defaults for local development.
 * Secrets must never be exposed to the client.
 */

import { z } from "zod";
import { getPublicAppUrl } from "@/config/app-url";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default(getPublicAppUrl()),
  NEXT_PUBLIC_APP_NAME: z.string().default("GB International Travel"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default("PKR"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("en"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? getPublicAppUrl(),
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });

  if (!parsed.success) {
    throw new Error(`Invalid client environment: ${parsed.error.message}`);
  }

  return parsed.data;
}
