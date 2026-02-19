import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AIAnalyzerService,
  type ReviewForAnalysis,
} from "@/services/ai-analyzer.service";
import { SocialSignalService } from "@/services/social-signal.service";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/sync-pulse
 *
 * MASTER DATA PIPELINE — The Engine.
 * Runs every 6-12 hours via external cron trigger.
 *
 * Pipeline per venue:
 *   1. Fetch fresh 2GIS reviews (via Apify scraper)
 *   2. Analyze with Gemini (sentiment + structured insights)
 *   3. Store new reviews + social signals
 *   4. Recalculate Live Score
 *   5. Update venue AI description with latest analysis
 *
 * Batch limit: processes max BATCH_SIZE venues per run
 * to avoid Railway/Vercel timeout (60s).
 *
 * Auth: Bearer CRON_SECRET
 */

const BATCH_SIZE = 10;
const STALE_HOURS = 24;

export async function POST(request: NextRequest) {
  // --- Auth ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  // Check 2GIS review scraping is configured
  const apifyToken = process.env.APIFY_TOKEN;
  const apify2GisActor = process.env.APIFY_2GIS_ACTOR;

  if (!apifyToken || !apify2GisActor) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message: "APIFY_TOKEN or APIFY_2GIS_ACTOR not set",
        },
      },
      { status: 503 },
    );
  }

  const startTime = Date.now();

  try {
    // --- Find stale venues (not updated in STALE_HOURS) ---
    const staleThreshold = new Date(
      Date.now() - STALE_HOURS * 60 * 60 * 1000,
    );

    const venues = await prisma.venue.findMany({
      where: {
        isActive: true,
        updatedAt: { lt: staleThreshold },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        twoGisUrl: true,
        liveScore: true,
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: "asc" }, // oldest first
      take: BATCH_SIZE,
    });

    if (venues.length === 0) {
      return NextResponse.json({
        data: {
          processed: 0,
          message: "All venues up to date",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info(`sync-pulse: processing ${venues.length} stale venues`, {
      endpoint: "/api/cron/sync-pulse",
    });

    const results: {
      venueId: string;
      name: string;
      newReviews: number;
      vibeScore: number | null;
      error?: string;
    }[] = [];

    for (const venue of venues) {
      try {
        const result = await processVenue(venue, apifyToken, apify2GisActor);
        results.push(result);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        logger.error(`sync-pulse: failed for "${venue.name}"`, {
          endpoint: "/api/cron/sync-pulse",
          error: msg,
        });
        results.push({
          venueId: venue.id,
          name: venue.name,
          newReviews: 0,
          vibeScore: null,
          error: msg,
        });
      }
    }

    const elapsed = Date.now() - startTime;
    const totalNewReviews = results.reduce(
      (sum, r) => sum + r.newReviews,
      0,
    );

    logger.info(
      `sync-pulse: done. ${results.length} venues, ${totalNewReviews} new reviews, ${elapsed}ms`,
      { endpoint: "/api/cron/sync-pulse" },
    );

    return NextResponse.json({
      data: {
        processed: results.length,
        totalNewReviews,
        elapsedMs: elapsed,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("sync-pulse: pipeline error", {
      endpoint: "/api/cron/sync-pulse",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: {
          code: "PIPELINE_ERROR",
          message: "Data pipeline failed",
        },
      },
      { status: 500 },
    );
  }
}

// ============================================
// PIPELINE: Process a single venue via 2GIS
// ============================================

interface VenueForProcessing {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  twoGisUrl: string | null;
  liveScore: number;
  category: { name: string };
}

async function processVenue(
  venue: VenueForProcessing,
  apifyToken: string,
  actorId: string,
) {
  // --- Step 1: Check if venue has a 2GIS URL ---
  if (!venue.twoGisUrl) {
    // No 2GIS URL — touch updatedAt so we don't retry immediately
    await prisma.venue.update({
      where: { id: venue.id },
      data: { updatedAt: new Date() },
    });
    return {
      venueId: venue.id,
      name: venue.name,
      newReviews: 0,
      vibeScore: null,
      error: "No 2GIS URL for this venue",
    };
  }

  // --- Step 2: Fetch 2GIS reviews via Apify ---
  const twoGisReviews = await fetch2GisReviews(
    venue.twoGisUrl,
    apifyToken,
    actorId,
  );

  if (twoGisReviews.length === 0) {
    await prisma.venue.update({
      where: { id: venue.id },
      data: { updatedAt: new Date() },
    });
    return {
      venueId: venue.id,
      name: venue.name,
      newReviews: 0,
      vibeScore: null,
    };
  }

  // --- Step 3: Filter out already-stored reviews ---
  const existingReviews = await prisma.review.findMany({
    where: { venueId: venue.id, source: "2gis" },
    select: { authorName: true, text: true },
  });

  const existingKeys = new Set(
    existingReviews.map(
      (r) => `${r.authorName}::${r.text?.slice(0, 50)}`,
    ),
  );

  const newReviews = twoGisReviews.filter(
    (r) =>
      r.text &&
      r.text.length > 5 &&
      !existingKeys.has(`${r.author}::${r.text.slice(0, 50)}`),
  );

  // --- Step 4: Analyze with Gemini ---
  const allReviewsForAnalysis: ReviewForAnalysis[] =
    twoGisReviews.map((r) => ({
      text: r.text || `Оценка: ${r.rating}/5`,
      rating: r.rating,
      source: "2gis",
    }));

  // Run analysis on all reviews (not just new) for full picture
  const analysis = await AIAnalyzerService.analyzeReviewsBatch(
    venue.name,
    venue.category.name,
    allReviewsForAnalysis,
  );

  // Get sentiment for new reviews individually
  let sentiments: number[] = [];
  if (newReviews.length > 0) {
    sentiments = await AIAnalyzerService.batchSentiment(
      newReviews.map(
        (r) => r.text || `Оценка: ${r.rating}/5`,
      ),
    );
  }

  // --- Step 5: Store new reviews ---
  for (let i = 0; i < newReviews.length; i++) {
    const review = newReviews[i];
    const sentiment =
      sentiments[i] ??
      Math.round(((review.rating - 3) / 2) * 100) / 100;

    await prisma.review.create({
      data: {
        venueId: venue.id,
        text: review.text || `Оценка: ${review.rating}/5`,
        sentiment,
        source: "2gis",
        rating: review.rating,
        authorName: review.author,
      },
    });
  }

  // --- Step 6: Create social signal record ---
  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

  await prisma.socialSignal.create({
    data: {
      venueId: venue.id,
      source: "2gis",
      mentionCount: Math.max(1, newReviews.length),
      sentimentAvg: Math.round(avgSentiment * 100) / 100,
    },
  });

  // --- Step 7: Recalculate Live Score ---
  const newScore =
    await SocialSignalService.calculateLiveScore(venue.id);

  // --- Step 8: Update venue with new score + AI analysis ---
  const aiDescription = [
    analysis.summary,
    analysis.strongPoints.length > 0
      ? `Сильные стороны: ${analysis.strongPoints.join(", ")}`
      : "",
    analysis.weakPoints.length > 0
      ? `Зоны роста: ${analysis.weakPoints.join(", ")}`
      : "",
    `Тренд: ${analysis.sentimentTrend === "improving" ? "улучшается" : analysis.sentimentTrend === "declining" ? "ухудшается" : "стабильный"}`,
  ]
    .filter(Boolean)
    .join(". ");

  await prisma.venue.update({
    where: { id: venue.id },
    data: {
      liveScore: newScore,
      aiDescription,
    },
  });

  // Save score to history
  await prisma.scoreHistory.create({
    data: { venueId: venue.id, score: newScore },
  });

  logger.info(
    `sync-pulse: "${venue.name}" — ${newReviews.length} new 2GIS reviews, ` +
      `vibe ${analysis.vibeScore}, score ${venue.liveScore}→${newScore}`,
    { endpoint: "/api/cron/sync-pulse" },
  );

  return {
    venueId: venue.id,
    name: venue.name,
    newReviews: newReviews.length,
    vibeScore: analysis.vibeScore,
  };
}

// ============================================
// 2GIS review fetching via Apify
// ============================================

interface TwoGisReview {
  text: string;
  rating: number;
  author: string;
  date?: string;
}

async function fetch2GisReviews(
  twoGisUrl: string,
  token: string,
  actorId: string,
): Promise<TwoGisReview[]> {
  try {
    // Start Apify actor run
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: twoGisUrl }],
          maxReviews: 10,
          language: "ru",
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!runRes.ok) {
      logger.warn("2GIS Apify actor start failed", {
        endpoint: "sync-pulse.fetch2GisReviews",
        error: `${runRes.status}`,
      });
      return [];
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;
    if (!runId || !datasetId) return [];

    // Poll for completion (max 2 min, check every 10s)
    const maxWait = 120_000;
    const pollInterval = 10_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData.data?.status;
      if (status === "SUCCEEDED") break;
      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        logger.warn(`2GIS Apify run ${status}`, {
          endpoint: "sync-pulse.fetch2GisReviews",
        });
        return [];
      }
    }

    // Fetch results
    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!dataRes.ok) return [];

    const items: { text?: string; rating?: number; author?: string; date?: string }[] =
      await dataRes.json();

    return items
      .filter((item) => item.text && item.text.length > 5)
      .map((item) => ({
        text: item.text!,
        rating: item.rating || 3,
        author: item.author || "Гость",
        date: item.date,
      }));
  } catch (error) {
    logger.error("2GIS review fetching failed", {
      endpoint: "sync-pulse.fetch2GisReviews",
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
