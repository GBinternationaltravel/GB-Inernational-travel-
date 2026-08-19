/**
 * Travelport OAuth token client.
 * Official auth endpoints (post-migration):
 * - Pre-production: https://auth.pp.travelport.net/oauth/token
 * - Production: https://auth.travelport.net/oauth/token
 *
 * Credentials: username, password, client_id, client_secret
 * Token valid ~24h — cache and reuse; do not request per API call.
 */

import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { SupplierError } from "@/providers/flights/supplier-errors";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export function clearTravelportTokenCache(): void {
  tokenCache = null;
}

export async function getTravelportAccessToken(
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const { travelport } = getFlightSupplierEnv();
  if (!travelport.hasCredentials) {
    throw new SupplierError(
      "NOT_CONFIGURED",
      "Travelport sandbox credentials are not configured.",
    );
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username: travelport.username,
    password: travelport.password,
    client_id: travelport.clientId,
    client_secret: travelport.clientSecret,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetchImpl(travelport.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SupplierError(
        "SUPPLIER_UNAVAILABLE",
        "Travelport authentication failed.",
        response.status >= 500,
      );
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!json.access_token) {
      throw new SupplierError(
        "SUPPLIER_UNAVAILABLE",
        "Travelport authentication did not return an access token.",
      );
    }

    const expiresInSec = Number(json.expires_in ?? 86_400);
    tokenCache = {
      accessToken: json.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
    return json.access_token;
  } catch (error) {
    if (error instanceof SupplierError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SupplierError(
        "SUPPLIER_TIMEOUT",
        "Travelport authentication timed out.",
        true,
      );
    }
    throw new SupplierError(
      "SUPPLIER_UNAVAILABLE",
      "Travelport authentication request failed.",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}
