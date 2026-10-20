import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * One redirect to the canonical https host from NEXT_PUBLIC_APP_URL.
 * www and non-www are not both kept. Localhost is left alone.
 */
export function middleware(request: NextRequest) {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return NextResponse.next();

  let canonical: URL;
  try {
    canonical = new URL(raw);
  } catch {
    return NextResponse.next();
  }

  if (canonical.hostname === "localhost" || canonical.hostname === "127.0.0.1") {
    return NextResponse.next();
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
  if (host === canonical.hostname && proto === "https") {
    return NextResponse.next();
  }

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical.origin);
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml).*)"],
};
