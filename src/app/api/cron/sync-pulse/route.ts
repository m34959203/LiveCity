import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GooglePlacesClient } from "@/lib/google-places";
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
 *   1. Fetch fresh Google reviews (Places API)
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

const googleClient = new GooglePlacesClient();

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

  if (!googleClient.isConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message: "GOOGLE_PLACES_API_KEY not set",
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
        googlePlaceId: true,
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
        const result = await processVenue(venue);
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
// PIPELINE: Process a single venue
// ============================================

interface VenueForProcessing {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  googlePlaceId: string | null;
  liveScore: number;
  category: { name: string };
}

async function processVenue(venue: VenueForProcessing) {
  // --- Step 1: Resolve Google Place ID ---
  let placeId = venue.googlePlaceId;

  if (!placeId) {
    placeId = await googleClient.findPlaceId(
      venue.name,
      venue.latitude,
      venue.longitude,
    );

    if (placeId) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { googlePlaceId: placeId },
      });
    } else {
      // Touch updatedAt so we don't retry immediately
      await prisma.venue.update({
        where: { id: venue.id },
        data: { updatedAt: new Date() },
      });
      return {
        venueId: venue.id,
        name: venue.name,
        newReviews: 0,
        vibeScore: null,
        error: "Could not resolve Google Place ID",
      };
    }
  }

  // --- Step 2: Fetch Google reviews ---
  const details = await googleClient.getPlaceDetails(placeId);
  if (!details || details.reviews.length === 0) {
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
    where: { venueId: venue.id, source: "google" },
    select: { authorName: true, text: true },
  });

  const existingKeys = new Set(
    existingReviews.map(
      (r) => `${r.authorName}::${r.text?.slice(0, 50)}`,
    ),
  );

  const newGoogleReviews = details.reviews.filter(
    (r) =>
      !existingKeys.has(`${r.author_name}::${r.text?.slice(0, 50)}`),
  );

  // --- Step 4: Analyze with Gemini ---
  const allReviewsForAnalysis: ReviewForAnalysis[] =
    details.reviews.map((r) => ({
      text: r.text || `Оценка: ${r.rating}/5`,
      rating: r.rating,
      source: "google",
    }));

  // Run analysis on all reviews (not just new) for full picture
  const analysis = await AIAnalyzerService.analyzeReviewsBatch(
    venue.name,
    venue.category.name,
    allReviewsForAnalysis,
  );

  // Get sentiment for new reviews individually
  let sentiments: number[] = [];
  if (newGoogleReviews.length > 0) {
    sentiments = await AIAnalyzerService.batchSentiment(
      newGoogleReviews.map(
        (r) => r.text || `Оценка: ${r.rating}/5`,
      ),
    );
  }

  // --- Step 5: Store new reviews ---
  for (let i = 0; i < newGoogleReviews.length; i++) {
    const review = newGoogleReviews[i];
    const sentiment =
      sentiments[i] ??
      Math.round(((review.rating - 3) / 2) * 100) / 100;

    await prisma.review.create({
      data: {
        venueId: venue.id,
        text: review.text || `Оценка: ${review.rating}/5`,
        sentiment,
        source: "google",
        rating: review.rating,
        authorName: review.author_name,
        createdAt: new Date(review.time * 1000),
      },
    });
  }

  // --- Step 6: Create social signal record ---
  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : Math.round(((details.rating - 3) / 2) * 100) / 100;

  await prisma.socialSignal.create({
    data: {
      venueId: venue.id,
      source: "google_maps",
      mentionCount: Math.max(1, newGoogleReviews.length),
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
    `sync-pulse: "${venue.name}" — ${newGoogleReviews.length} new reviews, ` +
      `vibe ${analysis.vibeScore}, score ${venue.liveScore}→${newScore}`,
    { endpoint: "/api/cron/sync-pulse" },
  );

  return {
    venueId: venue.id,
    name: venue.name,
    newReviews: newGoogleReviews.length,
    vibeScore: analysis.vibeScore,
  };
}
