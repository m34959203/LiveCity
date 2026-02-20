import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AIAnalyzerService,
  type ReviewForAnalysis,
} from "@/services/ai-analyzer.service";
import { SocialSignalService } from "@/services/social-signal.service";
import { TwoGisService } from "@/services/twogis.service";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/sync-pulse
 *
 * MASTER DATA PIPELINE — The Engine.
 * Runs every 6-12 hours via external cron trigger.
 *
 * Three modes (auto-selected):
 *   A) With Apify (APIFY_TOKEN set) — legacy, uses paid Apify actors
 *   B) Own 2GIS parser (default) — free, uses public 2GIS APIs
 *   C) OSM-only fallback — no reviews, just score recalculation
 *
 * Pipeline per venue:
 *   1. Search venue on 2GIS → get address, hours, phone, rating
 *   2. Fetch reviews from 2GIS → store new ones
 *   3. Analyze with Gemini (sentiment + structured insights)
 *   4. Recalculate Live Score
 *   5. Update venue AI description
 *
 * Auth: Bearer CRON_SECRET
 */

const BATCH_SIZE_APIFY = Number(process.env.CRON_BATCH_SIZE) || 10;
const BATCH_SIZE_PARSER = Number(process.env.CRON_BATCH_SIZE_PARSER) || 30;
const BATCH_SIZE_OSM = Number(process.env.CRON_BATCH_SIZE_OSM) || 100;
const STALE_HOURS = Number(process.env.CRON_STALE_HOURS) || 24;

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

  const apifyToken = process.env.APIFY_TOKEN;
  const apify2GisActor = process.env.APIFY_2GIS_ACTOR;
  const hasApify = !!(apifyToken && apify2GisActor);
  // Mode: apify (legacy) → parser (own 2GIS) → osm-only (fallback)
  const mode: "apify" | "parser" | "osm-only" = hasApify
    ? "apify"
    : "parser";

  const startTime = Date.now();

  try {
    // --- Find venues that need processing ---
    // Priority 1: Unscored venues (liveScore near 0) — always process
    // Priority 2: Stale venues (not updated in STALE_HOURS)
    const staleThreshold = new Date(
      Date.now() - STALE_HOURS * 60 * 60 * 1000,
    );

    const batchSize = mode === "apify"
      ? BATCH_SIZE_APIFY
      : mode === "parser"
        ? BATCH_SIZE_PARSER
        : BATCH_SIZE_OSM;

    const venues = await prisma.venue.findMany({
      where: {
        isActive: true,
        OR: [
          { liveScore: { lt: 0.1 } },         // unscored venues (priority)
          { updatedAt: { lt: staleThreshold } }, // stale venues
        ],
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        twoGisUrl: true,
        twoGisId: true,
        liveScore: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: [
        { liveScore: "asc" },  // unscored first
        { updatedAt: "asc" },  // then oldest
      ],
      take: batchSize,
    });

    if (venues.length === 0) {
      return NextResponse.json({
        data: {
          processed: 0,
          mode,
          message: "All venues up to date",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info(
      `sync-pulse: processing ${venues.length} stale venues (mode: ${mode})`,
      { endpoint: "/api/cron/sync-pulse" },
    );

    const results: {
      venueId: string;
      name: string;
      newReviews: number;
      vibeScore: number | null;
      error?: string;
    }[] = [];

    for (const venue of venues) {
      try {
        let result: ProcessResult;
        if (mode === "apify") {
          result = await processVenueWithApify(venue, apifyToken!, apify2GisActor!);
        } else if (mode === "parser") {
          result = await processVenueWithParser(venue);
        } else {
          result = await processVenueOsmOnly(venue);
        }
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
        mode,
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
// Shared types
// ============================================

interface VenueForProcessing {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  twoGisUrl: string | null;
  twoGisId: string | null;
  liveScore: number;
  category: { name: string; slug: string };
}

interface ProcessResult {
  venueId: string;
  name: string;
  newReviews: number;
  vibeScore: number | null;
  error?: string;
}

// ============================================
// MODE B: OSM-only pipeline (no Apify needed)
// ============================================

async function processVenueOsmOnly(
  venue: VenueForProcessing,
): Promise<ProcessResult> {
  // Recalculate Live Score (uses category baseline when no signals)
  const newScore = await SocialSignalService.calculateLiveScore(venue.id);

  // Fetch existing reviews for AI analysis (if any)
  const existingReviews = await prisma.review.findMany({
    where: { venueId: venue.id },
    select: { text: true, rating: true, source: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  let aiDescription = "";
  let vibeScore: number | null = null;

  if (existingReviews.length > 0) {
    // Have reviews — run full AI analysis
    const reviewsForAnalysis: ReviewForAnalysis[] = existingReviews.map((r) => ({
      text: r.text,
      rating: r.rating ?? 3,
      source: r.source,
    }));

    const analysis = await AIAnalyzerService.analyzeReviewsBatch(
      venue.name,
      venue.category.name,
      reviewsForAnalysis,
    );

    vibeScore = analysis.vibeScore;
    aiDescription = [
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
  } else {
    // No reviews yet — don't generate fake AI description
    aiDescription = "";
  }

  // Update venue
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
    `sync-pulse [osm]: "${venue.name}" — score ${venue.liveScore}→${newScore}`,
    { endpoint: "/api/cron/sync-pulse" },
  );

  return {
    venueId: venue.id,
    name: venue.name,
    newReviews: 0,
    vibeScore,
  };
}

// ============================================
// MODE B: Own 2GIS parser (free, no Apify needed)
// ============================================

async function processVenueWithParser(
  venue: VenueForProcessing,
): Promise<ProcessResult> {
  const { getClosestCity } = await import("@/lib/cities");
  const city = getClosestCity(venue.latitude, venue.longitude);

  // 1. Search venue on 2GIS + fetch reviews
  const twoGisId = venue.twoGisId;
  let reviews: { text: string; rating: number; author: string; date?: string }[] = [];
  const venueUpdate: Record<string, unknown> = {};

  if (twoGisId) {
    // Already linked — just fetch reviews
    reviews = await TwoGisService.fetchReviews(twoGisId, 20);
  } else {
    // Search + link
    const result = await TwoGisService.getVenueWithReviews(
      venue.name,
      venue.latitude,
      venue.longitude,
      city.name,
      20,
    );

    if (result) {
      reviews = result.reviews;
      // Enrich venue with 2GIS data
      venueUpdate.twoGisId = result.venue.twoGisId;
      if (result.venue.address) venueUpdate.address = result.venue.address;
      if (result.venue.phone) venueUpdate.phone = result.venue.phone;
      if (result.venue.workingHours) venueUpdate.workingHours = result.venue.workingHours;
    }
  }

  if (reviews.length === 0) {
    // No reviews found — fall back to OSM-only (score recalc only)
    if (Object.keys(venueUpdate).length > 0) {
      await prisma.venue.update({ where: { id: venue.id }, data: venueUpdate });
    }
    return processVenueOsmOnly(venue);
  }

  // 2. Filter out already-stored reviews
  const existingReviews = await prisma.review.findMany({
    where: { venueId: venue.id, source: "2gis" },
    select: { authorName: true, text: true },
  });

  const existingKeys = new Set(
    existingReviews.map((r) => `${r.authorName}::${r.text?.slice(0, 50)}`),
  );

  const newReviews = reviews.filter(
    (r) =>
      r.text &&
      r.text.length > 5 &&
      !existingKeys.has(`${r.author}::${r.text.slice(0, 50)}`),
  );

  // 3. Analyze ALL reviews with Gemini (for AI description)
  const allReviewsForAnalysis: ReviewForAnalysis[] = reviews.map((r) => ({
    text: r.text || `Оценка: ${r.rating}/5`,
    rating: r.rating,
    source: "2gis",
  }));

  const analysis = await AIAnalyzerService.analyzeReviewsBatch(
    venue.name,
    venue.category.name,
    allReviewsForAnalysis,
  );

  // 4. Get sentiment for new reviews
  let sentiments: number[] = [];
  if (newReviews.length > 0) {
    sentiments = await AIAnalyzerService.batchSentiment(
      newReviews.map((r) => r.text || `Оценка: ${r.rating}/5`),
    );
  }

  // 5. Store new reviews
  for (let i = 0; i < newReviews.length; i++) {
    const review = newReviews[i];
    const sentiment =
      sentiments[i] ?? Math.round(((review.rating - 3) / 2) * 100) / 100;

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

  // 6. Create social signal
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

  // 7. Recalculate Live Score
  const newScore = await SocialSignalService.calculateLiveScore(venue.id);

  // 8. Build AI description
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

  // 9. Update venue
  await prisma.venue.update({
    where: { id: venue.id },
    data: {
      ...venueUpdate,
      liveScore: newScore,
      aiDescription,
    },
  });

  await prisma.scoreHistory.create({
    data: { venueId: venue.id, score: newScore },
  });

  logger.info(
    `sync-pulse [parser]: "${venue.name}" — ${newReviews.length} new 2GIS reviews, ` +
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
// MODE A (legacy): Full pipeline with Apify 2GIS reviews
// ============================================

async function processVenueWithApify(
  venue: VenueForProcessing,
  apifyToken: string,
  actorId: string,
): Promise<ProcessResult> {
  if (!venue.twoGisUrl) {
    // No 2GIS URL — fall back to OSM-only pipeline
    return processVenueOsmOnly(venue);
  }

  // Fetch 2GIS reviews via Apify
  const twoGisReviews = await fetch2GisReviews(
    venue.twoGisUrl,
    apifyToken,
    actorId,
  );

  if (twoGisReviews.length === 0) {
    // No reviews from Apify — fall back to OSM-only
    return processVenueOsmOnly(venue);
  }

  // Filter out already-stored reviews
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

  // Analyze with Gemini
  const allReviewsForAnalysis: ReviewForAnalysis[] =
    twoGisReviews.map((r) => ({
      text: r.text || `Оценка: ${r.rating}/5`,
      rating: r.rating,
      source: "2gis",
    }));

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

  // Store new reviews
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

  // Create social signal record
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

  // Recalculate Live Score
  const newScore =
    await SocialSignalService.calculateLiveScore(venue.id);

  // Update venue with new score + AI analysis
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
    `sync-pulse [apify]: "${venue.name}" — ${newReviews.length} new 2GIS reviews, ` +
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
    const pollStart = Date.now();

    while (Date.now() - pollStart < maxWait) {
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
