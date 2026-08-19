import { NextResponse } from "next/server";
import { registerCustomer, UserServiceError } from "@/services/user-service";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`auth:register:${ip}`, { limit: 8, windowMs: 60_000 });
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
    return NextResponse.json(
      { error: "Please check your registration details." },
      { status: 400 },
    );
  }

  try {
    const user = await registerCustomer(body);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: error.code === "DUPLICATE" ? 409 : 400 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't create your account right now." },
      { status: 500 },
    );
  }
}
