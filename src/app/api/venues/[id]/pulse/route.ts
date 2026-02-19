import { NextResponse } from "next/server";
import { SocialSignalService } from "@/services/social-signal.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/venues/:id/pulse
 *
 * Returns the social pulse for a venue — real-time social activity data.
 * This is the "Truth Filter": how alive is this place RIGHT NOW
 * based on real social signals, not fake reviews.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { id } = await params;
    const pulse = await SocialSignalService.getSocialPulse(id);

    const response = NextResponse.json({ data: pulse });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/venues/:id/pulse failed", {
      endpoint: "/api/venues/:id/pulse",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}
