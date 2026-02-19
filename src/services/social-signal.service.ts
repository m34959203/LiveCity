import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { geminiModel } from "@/lib/gemini";

// ============================================
// Social Signal Service — Multi-source collection
// ============================================
// Collects social signals from:
//   1. 2GIS — reviews via Apify scraper
//   2. Instagram — mentions via Apify scraper (when configured)
//   3. Gemini AI — sentiment analysis on review texts
//
// Architecture: each source is a private method.
// Enable sources by setting env vars:
//   APIFY_TOKEN + APIFY_2GIS_ACTOR — 2GIS reviews
//   APIFY_TOKEN + APIFY_INSTA_ACTOR — Instagram mentions
// ============================================

interface SocialPulse {
  totalMentions: number;
  avgSentiment: number;
  trend: "rising" | "stable" | "declining";
  sources: { source: string; mentions: number; sentiment: number }[];
}

interface VenueForCollection {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  twoGisId: string | null;
  twoGisUrl: string | null;
  instagramHandle: string | null;
}

export class SocialSignalService {
  // ------------------------------------------
  // PUBLIC: Collect signals for a single venue
  // ------------------------------------------
  static async collectSignals(venueId: string): Promise<void> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        twoGisId: true,
        twoGisUrl: true,
        instagramHandle: true,
      },
    });
    if (!venue) return;

    // 2GIS — reviews via Apify scraper
    if (process.env.APIFY_TOKEN && process.env.APIFY_2GIS_ACTOR && venue.twoGisUrl) {
      await this.collect2GisSignals(venue);
    }

    // Instagram — mentions via Apify scraper
    if (process.env.APIFY_TOKEN && process.env.APIFY_INSTA_ACTOR && venue.instagramHandle) {
      await this.collectInstagramSignals(venue);
    }
  }

  // ------------------------------------------
  // PUBLIC: Collect signals for all venues
  // ------------------------------------------
  static async collectAllSignals(): Promise<number> {
    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        twoGisId: true,
        twoGisUrl: true,
        instagramHandle: true,
      },
    });

    let collected = 0;
    for (const venue of venues) {
      try {
        await this.collectSignals(venue.id);
        collected++;
      } catch (error) {
        logger.error(`Signal collection failed for venue ${venue.name}`, {
          endpoint: "SocialSignalService.collectAllSignals",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info(`Social signals collected for ${collected}/${venues.length} venues`, {
      endpoint: "SocialSignalService.collectAllSignals",
    });

    return collected;
  }

  // ------------------------------------------
  // 2GIS: Reviews via Apify scraper
  // ------------------------------------------

  /**
   * Collect reviews from 2GIS via Apify actor.
   * Requires: APIFY_TOKEN + APIFY_2GIS_ACTOR env vars.
   *
   * How it works:
   * 1. Calls Apify 2GIS scraper with venue's twoGisUrl
   * 2. Gets reviews with text, rating, author
   * 3. Runs sentiment analysis via Gemini
   * 4. Stores in DB with source="2gis"
   */
  private static async collect2GisSignals(
    venue: VenueForCollection,
  ): Promise<void> {
    if (!venue.twoGisUrl) return;

    try {
      const token = process.env.APIFY_TOKEN;
      const actorId = process.env.APIFY_2GIS_ACTOR;

      // Start Apify actor run
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: [{ url: venue.twoGisUrl }],
            maxReviews: 10,
            language: "ru",
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!runRes.ok) {
        logger.warn("2GIS Apify actor start failed", {
          endpoint: "SocialSignalService.collect2GisSignals",
          error: `${runRes.status}`,
        });
        return;
      }

      const runData = await runRes.json();
      const runId = runData.data?.id;
      const datasetId = runData.data?.defaultDatasetId;
      if (!runId || !datasetId) return;

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
            endpoint: "SocialSignalService.collect2GisSignals",
          });
          return;
        }
      }

      // Fetch results
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!dataRes.ok) return;

      const items: { text?: string; rating?: number; author?: string; date?: string }[] =
        await dataRes.json();

      // Filter new reviews
      const existingReviews = await prisma.review.findMany({
        where: { venueId: venue.id, source: "2gis" },
        select: { authorName: true, text: true },
      });
      const existingKeys = new Set(
        existingReviews.map((r) => `${r.authorName}::${r.text?.slice(0, 50)}`),
      );

      const newReviews = items.filter(
        (r) =>
          r.text &&
          r.text.length > 5 &&
          !existingKeys.has(`${r.author || "Гость"}::${r.text.slice(0, 50)}`),
      );

      if (newReviews.length === 0) return;

      // Sentiment analysis
      const sentiments = await this.batchAnalyzeSentiment(
        newReviews.map((r) => ({
          author: r.author || "Гость",
          rating: r.rating || 3,
          text: r.text || "",
        })),
      );

      let sentimentSum = 0;
      for (let i = 0; i < newReviews.length; i++) {
        const review = newReviews[i];
        const sentiment = sentiments[i] ?? 0;
        sentimentSum += sentiment;

        await prisma.review.create({
          data: {
            venueId: venue.id,
            text: review.text!,
            sentiment,
            source: "2gis",
            rating: review.rating || null,
            authorName: review.author || "Гость",
          },
        });
      }

      await prisma.socialSignal.create({
        data: {
          venueId: venue.id,
          source: "2gis",
          mentionCount: newReviews.length,
          sentimentAvg: Math.round((sentimentSum / newReviews.length) * 100) / 100,
        },
      });

      logger.info(
        `2GIS signals: "${venue.name}" — ${newReviews.length} new reviews`,
        { endpoint: "SocialSignalService.collect2GisSignals" },
      );
    } catch (error) {
      logger.error("2GIS signal collection failed", {
        endpoint: "SocialSignalService.collect2GisSignals",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ------------------------------------------
  // INSTAGRAM: Mentions via apify/instagram-scraper
  // ------------------------------------------

  /**
   * Collect Instagram signals via `apify/instagram-scraper` actor.
   * Actor ID: shu8hvrXbJbY3Eb9W (apify/instagram-scraper)
   * Pricing: from $1.50 / 1,000 results
   *
   * Input: { directUrls, resultsType, resultsLimit, onlyPostsNewerThan }
   * Output: { caption, likesCount, commentsCount, timestamp, ownerUsername, ... }
   *   - likesCount = -1 means author hid like count
   *
   * What we extract:
   * - Posts from venue's Instagram profile (last 7 days)
   * - Engagement (likes + comments * 3) → mentionCount for Live Score
   * - Captions → Gemini sentiment analysis
   */
  private static async collectInstagramSignals(
    venue: VenueForCollection,
  ): Promise<void> {
    if (!venue.instagramHandle) return;

    try {
      const token = process.env.APIFY_TOKEN;
      const actorId = process.env.APIFY_INSTA_ACTOR || "apify/instagram-scraper";

      // Only fetch posts from the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const profileUrl = `https://www.instagram.com/${venue.instagramHandle.replace("@", "")}/`;

      // 1. Start actor run
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            directUrls: [profileUrl],
            resultsType: "posts",
            resultsLimit: 20,
            onlyPostsNewerThan: sevenDaysAgo.toISOString(),
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!runRes.ok) {
        logger.warn("Instagram Apify actor start failed", {
          endpoint: "SocialSignalService.collectInstagramSignals",
          error: `${runRes.status}`,
        });
        return;
      }

      const runData = await runRes.json();
      const runId = runData.data?.id;
      const datasetId = runData.data?.defaultDatasetId;
      if (!runId || !datasetId) return;

      // 2. Poll for completion (max 2 min, check every 10s)
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
          logger.warn(`Instagram Apify run ${status}`, {
            endpoint: "SocialSignalService.collectInstagramSignals",
          });
          return;
        }
      }

      // 3. Fetch results from dataset
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!dataRes.ok) return;

      interface InstaPost {
        caption?: string;
        likesCount?: number;
        commentsCount?: number;
        timestamp?: string;
        ownerUsername?: string;
        type?: string;    // "Image", "Video", "Sidecar" (carousel)
        videoViewCount?: number;
      }

      const posts: InstaPost[] = await dataRes.json();

      if (posts.length === 0) return;

      // 4. Calculate engagement (likesCount = -1 means hidden, treat as 0)
      const totalEngagement = posts.reduce((sum, p) => {
        const likes = (p.likesCount ?? 0) > 0 ? p.likesCount! : 0;
        const comments = (p.commentsCount ?? 0) * 3; // Comments weighted 3x
        const views = Math.floor((p.videoViewCount ?? 0) / 10); // Video views weighted 1/10
        return sum + likes + comments + views;
      }, 0);

      // 5. Sentiment analysis on captions
      const captions = posts
        .map((p) => p.caption)
        .filter((c): c is string => !!c && c.length > 5);

      let avgSentiment = 0.3; // Instagram skews positive by nature
      if (captions.length > 0) {
        const sentiments = await this.batchAnalyzeSentiment(
          captions.map((text) => ({
            author: venue.instagramHandle || "instagram",
            rating: 4,
            text,
          })),
        );
        avgSentiment =
          sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      }

      // 6. Normalize engagement → mention count
      //    ~100 engagement ≈ 1 "mention" in our system
      const mentionCount = Math.max(1, Math.round(totalEngagement / 100));

      await prisma.socialSignal.create({
        data: {
          venueId: venue.id,
          source: "instagram",
          mentionCount,
          sentimentAvg: Math.round(avgSentiment * 100) / 100,
        },
      });

      logger.info(
        `Instagram signals: "${venue.name}" — ${posts.length} posts, ` +
          `${totalEngagement} engagement, sentiment ${avgSentiment.toFixed(2)}`,
        { endpoint: "SocialSignalService.collectInstagramSignals" },
      );
    } catch (error) {
      logger.error("Instagram signal collection failed", {
        endpoint: "SocialSignalService.collectInstagramSignals",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ------------------------------------------
  // SENTIMENT: Batch analysis via Gemini
  // ------------------------------------------

  /**
   * Analyze sentiment of multiple reviews in a single Gemini call.
   * Returns array of scores in [-1, 1] range.
   */
  private static async batchAnalyzeSentiment(
    reviews: { author: string; rating: number; text: string }[],
  ): Promise<number[]> {
    if (reviews.length === 0) return [];

    const reviewTexts = reviews
      .map((r, i) => `[${i + 1}] ${r.text || `Rating: ${r.rating}/5`}`)
      .join("\n");

    try {
      const result = await geminiModel.generateContent(
        `Analyze the sentiment of each review below. ` +
          `For each, return a number from -1.0 (very negative) to 1.0 (very positive). ` +
          `Return ONLY a JSON array of numbers, one per review. ` +
          `Example: [-0.3, 0.8, 0.5]\n\n${reviewTexts}`,
      );

      const text = result.response.text().trim();
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) {
        return reviews.map((r) => this.ratingToSentiment(r.rating));
      }

      const scores: unknown[] = JSON.parse(match[0]);
      return scores.map((s, i) => {
        const num = Number(s);
        if (isNaN(num)) return this.ratingToSentiment(reviews[i].rating);
        return Math.max(-1, Math.min(1, Math.round(num * 100) / 100));
      });
    } catch (error) {
      logger.warn("Gemini sentiment analysis failed, using rating fallback", {
        endpoint: "SocialSignalService.batchAnalyzeSentiment",
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback: derive sentiment from star rating
      return reviews.map((r) => this.ratingToSentiment(r.rating));
    }
  }

  // ------------------------------------------
  // HELPERS
  // ------------------------------------------

  /** Convert 1-5 star rating to -1..1 sentiment */
  private static ratingToSentiment(rating: number): number {
    // 1 star → -1, 3 stars → 0, 5 stars → 1
    return Math.round(((rating - 3) / 2) * 100) / 100;
  }

  // ------------------------------------------
  // PULSE: Aggregation (unchanged — works with real data)
  // ------------------------------------------

  /**
   * Calculate social pulse for a venue based on recent signals.
   * This is the CORE of the "Truth Filter" — real social activity.
   */
  static async getSocialPulse(venueId: string): Promise<SocialPulse> {
    const now = new Date();
    const recentWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const olderWindow = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Recent signals (last 7 days)
    const recentSignals = await prisma.socialSignal.findMany({
      where: { venueId, collectedAt: { gte: recentWindow } },
    });

    // Older signals (7-14 days ago) for trend
    const olderSignals = await prisma.socialSignal.findMany({
      where: {
        venueId,
        collectedAt: { gte: olderWindow, lt: recentWindow },
      },
    });

    // Aggregate by source
    const sourceMap = new Map<
      string,
      { mentions: number; sentimentSum: number; count: number }
    >();

    for (const s of recentSignals) {
      const existing = sourceMap.get(s.source);
      if (existing) {
        existing.mentions += s.mentionCount;
        existing.sentimentSum += s.sentimentAvg;
        existing.count++;
      } else {
        sourceMap.set(s.source, {
          mentions: s.mentionCount,
          sentimentSum: s.sentimentAvg,
          count: 1,
        });
      }
    }

    const sources = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      mentions: data.mentions,
      sentiment:
        Math.round((data.sentimentSum / Math.max(1, data.count)) * 100) / 100,
    }));

    const totalMentions = sources.reduce((sum, s) => sum + s.mentions, 0);
    const avgSentiment =
      sources.length > 0
        ? Math.round(
            (sources.reduce((sum, s) => sum + s.sentiment, 0) /
              sources.length) *
              100,
          ) / 100
        : 0;

    // Trend: compare recent vs older mention volume
    const recentTotal = recentSignals.reduce(
      (sum, s) => sum + s.mentionCount,
      0,
    );
    const olderTotal = olderSignals.reduce(
      (sum, s) => sum + s.mentionCount,
      0,
    );

    let trend: "rising" | "stable" | "declining" = "stable";
    if (olderTotal > 0) {
      const change = (recentTotal - olderTotal) / olderTotal;
      if (change > 0.15) trend = "rising";
      else if (change < -0.15) trend = "declining";
    }

    return { totalMentions, avgSentiment, trend, sources };
  }

  // ------------------------------------------
  // LIVE SCORE: Formula (unchanged)
  // ------------------------------------------

  /**
   * Calculate Live Score from social signals.
   *
   * Formula:
   *   base (DB score) * 0.4
   * + social_activity * 0.3 (normalized mentions → 0-10)
   * + social_sentiment * 0.2 (sentiment -1..1 → 0-10)
   * + time_modifier * 0.1
   */
  static async calculateLiveScore(venueId: string): Promise<number> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { liveScore: true },
    });
    if (!venue) return 0;

    const pulse = await this.getSocialPulse(venueId);

    // Base component (40%)
    const baseComponent = venue.liveScore * 0.4;

    // Social activity component (30%)
    // Normalize: 0 mentions = 0, 50+ mentions = 10
    const activityScore = Math.min(10, (pulse.totalMentions / 50) * 10);
    const activityComponent = activityScore * 0.3;

    // Sentiment component (20%)
    // Map -1..1 to 0..10
    const sentimentScore = (pulse.avgSentiment + 1) * 5;
    const sentimentComponent = sentimentScore * 0.2;

    // Time-of-day modifier (10%)
    const hour = new Date().getHours();
    let timeMod = 5; // neutral
    if (hour >= 11 && hour < 14) timeMod = 7;
    else if (hour >= 18 && hour < 22) timeMod = 8;
    else if (hour >= 22 || hour < 6) timeMod = 3;
    const timeComponent = timeMod * 0.1;

    const score =
      baseComponent + activityComponent + sentimentComponent + timeComponent;
    return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
  }
}
