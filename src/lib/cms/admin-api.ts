import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth/admin";
import { AdminServiceError } from "@/services/admin-booking-service";

export function adminCmsErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  if (error instanceof AdminServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN_ACTION"
          ? 403
          : error.code === "STORE"
            ? 503
            : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("[admin-cms]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
