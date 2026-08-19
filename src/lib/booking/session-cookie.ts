import { cookies } from "next/headers";
import { bookingCookieName } from "@/config/booking";

export type BookingSessionCookie = {
  reference: string;
  token: string;
};

export async function readBookingSessionCookie(): Promise<BookingSessionCookie | null> {
  const jar = await cookies();
  const raw = jar.get(bookingCookieName)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BookingSessionCookie;
    if (!parsed.reference || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setBookingSessionCookie(session: BookingSessionCookie): Promise<void> {
  const jar = await cookies();
  jar.set(bookingCookieName, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearBookingSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(bookingCookieName);
}
