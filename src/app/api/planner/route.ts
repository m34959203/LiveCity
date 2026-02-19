import { NextRequest, NextResponse } from "next/server";
import { PlannerService } from "@/services/planner.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/planner
 *
 * AI Day Planner — build an optimized day plan from natural language.
 * "Хочу провести день с семьёй — дети 5 и 8 лет, бюджет средний."
 */
export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await request.json();
    const { query, preferences, location } = body;

    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Опишите, как хотите провести день (минимум 5 символов).",
          },
        },
        { status: 400 },
      );
    }

    const plan = await PlannerService.planDay({
      query: query.trim(),
      preferences,
      location,
    });

    return NextResponse.json({ data: plan });
  } catch (error) {
    logger.error("POST /api/planner failed", {
      endpoint: "/api/planner",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}
