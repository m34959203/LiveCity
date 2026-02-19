import { NextRequest, NextResponse } from "next/server";
import { ScoreService } from "@/services/score.service";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/refresh-scores
 *
 * Trigger score refresh: collect social signals → recalculate live scores.
 * In production: called by Vercel Cron or external scheduler every 5-15 min.
 * Protected by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  try {
    const count = await ScoreService.refreshAllScores();

    logger.info("Cron: scores refreshed", {
      endpoint: "/api/cron/refresh-scores",
    });

    return NextResponse.json({
      data: {
        refreshed: count,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Cron: refresh-scores failed", {
      endpoint: "/api/cron/refresh-scores",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Score refresh failed" } },
      { status: 500 },
    );
  }
}
