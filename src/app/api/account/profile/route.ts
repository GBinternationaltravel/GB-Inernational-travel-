import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserProfile, UserServiceError } from "@/services/user-service";
import { rateLimit } from "@/lib/security/rate-limit";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const limited = rateLimit(`auth:profile:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check your profile details." }, { status: 400 });
  }

  try {
    const updated = await updateUserProfile(user.id, body);
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't update your profile right now." },
      { status: 500 },
    );
  }
}
