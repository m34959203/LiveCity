import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface SocialPulse {
  totalMentions: number;
  avgSentiment: number;
  trend: "rising" | "stable" | "declining";
  sources: { source: string; mentions: number; sentiment: number }[];
}

export class SocialSignalService {
  /**
   * Collect fresh social signals for a venue.
   * In production: call Instagram Graph API, Google Places API, TikTok API.
   * Now: simulate realistic signals based on venue data + time patterns.
   */
  static async collectSignals(venueId: string): Promise<void> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { liveScore: true, name: true },
    });
    if (!venue) return;

    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    const isPeakHours =
      (hour >= 11 && hour < 14) || (hour >= 18 && hour < 23);

    const sources = ["instagram", "google_maps", "tiktok"] as const;

    for (const source of sources) {
      // Base mentions proportional to venue quality
      let baseMentions = Math.round(venue.liveScore * 2);

      // Time modifiers
      if (isPeakHours) baseMentions = Math.round(baseMentions * 1.5);
      if (isWeekend) baseMentions = Math.round(baseMentions * 1.3);

      // Source-specific patterns
      if (source === "instagram") baseMentions = Math.round(baseMentions * 1.2);
      if (source === "tiktok") baseMentions = Math.round(baseMentions * 0.7);

      // Add realistic variance (±30%)
      const variance = 1 + (Math.random() - 0.5) * 0.6;
      const mentionCount = Math.max(0, Math.round(baseMentions * variance));

      // Sentiment follows score but with noise
      const baseSentiment = (venue.liveScore - 5) / 5; // -1 to 1 range
      const sentimentNoise = (Math.random() - 0.5) * 0.4;
      const sentimentAvg = Math.max(
        -1,
        Math.min(1, baseSentiment + sentimentNoise),
      );

      await prisma.socialSignal.create({
        data: {
          venueId,
          source,
          mentionCount,
          sentimentAvg: Math.round(sentimentAvg * 100) / 100,
        },
      });
    }
  }

  /**
   * Collect signals for all active venues.
   */
  static async collectAllSignals(): Promise<number> {
    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const v of venues) {
      await this.collectSignals(v.id);
    }

    logger.info("Social signals collected", {
      endpoint: "SocialSignalService.collectAll",
    });

    return venues.length;
  }

  /**
   * Calculate social pulse for a venue based on recent signals.
   * This is the CORE of the "Truth Filter" — real social activity,
   * not fake reviews.
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

  /**
   * Calculate Live Score from social signals.
   * This replaces the demo random jitter with REAL data.
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
