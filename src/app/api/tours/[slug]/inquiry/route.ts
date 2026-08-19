import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { tourInquiryCreateSchema } from "@/lib/validations/cms";
import { createTourInquiry, TourServiceError } from "@/services/tour-service";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`tours:inquiry:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = tourInquiryCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const inquiry = await createTourInquiry({
      tourSlug: slug,
      data: parsed.data,
    });

    return NextResponse.json({
      reference: inquiry.reference,
      status: inquiry.status,
      tourSlug: inquiry.tour.slug,
      tourName: inquiry.tour.name,
    });
  } catch (error) {
    if (error instanceof TourServiceError) {
      const status =
        error.code === "NOT_FOUND" ? 404 : error.code === "STORE" ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Could not record tour inquiry." }, { status: 500 });
  }
}
