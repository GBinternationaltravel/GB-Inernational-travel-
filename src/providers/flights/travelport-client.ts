/**
 * Low-level Travelport TripServices HTTP client (Flights API v11).
 * Endpoints from: https://developer.travelport.com/docs/flights/general/flights-api-endpoints
 */

import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { getTravelportAccessToken } from "@/providers/flights/travelport-auth";
import { SupplierError } from "@/providers/flights/supplier-errors";

export async function travelportRequest<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { travelport } = getFlightSupplierEnv();
  const fetchImpl = init.fetchImpl ?? fetch;
  const token = await getTravelportAccessToken(fetchImpl);
  const url = `${travelport.baseUrl}/${path.replace(/^\//, "")}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    Authorization: `Bearer ${token}`,
    "Accept-Version": travelport.apiVersion,
    "Content-Version": travelport.apiVersion,
  };

  if (travelport.accessGroup) {
    headers.XAUTH_TRAVELPORT_ACCESSGROUP = travelport.accessGroup;
  } else if (travelport.pcc) {
    headers["TVP-PCC-CORE"] = `${travelport.pcc}_${travelport.gds}`;
  }

  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 45_000);

  try {
    const response = await fetchImpl(url, {
      method: init.method ?? "POST",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw mapHttpError(response.status, json);
    }

    return json as T;
  } catch (error) {
    if (error instanceof SupplierError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SupplierError(
        "SUPPLIER_TIMEOUT",
        "Travelport request timed out.",
        true,
      );
    }
    throw new SupplierError(
      "SUPPLIER_UNAVAILABLE",
      "Travelport request failed.",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function mapHttpError(status: number, payload: unknown): SupplierError {
  const message = extractMessage(payload);
  const details = { httpStatus: status };
  if (status === 429) {
    return new SupplierError(
      "SUPPLIER_UNAVAILABLE",
      "Travelport rate limit reached. Please try again shortly.",
      true,
      details,
    );
  }
  if (status === 400 || status === 422) {
    if (/expir/i.test(message)) {
      return new SupplierError("OFFER_EXPIRED", "Travelport offer expired.", false, details);
    }
    if (/avail/i.test(message) || /sold.?out/i.test(message)) {
      return new SupplierError(
        "NO_AVAILABILITY",
        "Travelport reports no availability.",
        false,
        details,
      );
    }
    return new SupplierError(
      "INVALID_REQUEST",
      "Travelport rejected the request.",
      false,
      details,
    );
  }
  if (status === 401 || status === 403) {
    return new SupplierError(
      "SUPPLIER_UNAVAILABLE",
      "Travelport authentication/authorization failed.",
      false,
      details,
    );
  }
  if (status === 404) {
    return new SupplierError(
      "NO_AVAILABILITY",
      "Travelport resource not found.",
      false,
      details,
    );
  }
  if (status >= 500) {
    return new SupplierError(
      "SUPPLIER_UNAVAILABLE",
      "Travelport service is unavailable.",
      true,
      details,
    );
  }
  return new SupplierError(
    "SUPPLIER_UNAVAILABLE",
    "Travelport request failed.",
    false,
    details,
  );
}

function extractMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.Message === "string") return record.Message;
  if (Array.isArray(record.Error) && record.Error[0]) {
    const first = record.Error[0] as Record<string, unknown>;
    if (typeof first.Message === "string") return first.Message;
  }
  return JSON.stringify(payload).slice(0, 200);
}
