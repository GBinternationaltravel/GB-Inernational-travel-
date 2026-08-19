"use client";

import { useEffect } from "react";

/** Best-effort: claim guest booking cookie into the signed-in account. */
export function ClaimGuestBooking() {
  useEffect(() => {
    void fetch("/api/bookings/claim", { method: "POST" });
  }, []);
  return null;
}
