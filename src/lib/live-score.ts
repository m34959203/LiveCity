/**
 * LiveCity Live Score Algorithm
 *
 * The Live Score is a dynamic rating (0-10) that reflects a venue's
 * current quality based on real-time social media sentiment analysis.
 *
 * Key factors:
 * - Freshness: Recent reviews (< 24h) have 2x weight, old reviews (> 30d) have 0.1x
 * - Decay: If no mentions in 14 days, score drifts toward neutral (5.0)
 * - Sentiment: Each review contributes sentiment from -1 to +1, mapped to 0-10 scale
 */

import { differenceInHours, differenceInDays } from "date-fns";

interface ReviewData {
  sentiment: number; // -1 to 1
  published_at: string; // ISO date
}

/**
 * Calculate the freshness weight for a review based on how old it is.
 * - < 24 hours: weight 2.0
 * - 1-7 days: weight 1.5
 * - 7-14 days: weight 1.0
 * - 14-30 days: weight 0.5
 * - > 30 days: weight 0.1
 */
export function calculateFreshnessWeight(publishedAt: string): number {
  const now = new Date();
  const published = new Date(publishedAt);
  const hoursAgo = differenceInHours(now, published);
  const daysAgo = differenceInDays(now, published);

  if (hoursAgo < 24) return 2.0;
  if (daysAgo < 7) return 1.5;
  if (daysAgo < 14) return 1.0;
  if (daysAgo < 30) return 0.5;
  return 0.1;
}

/**
 * Calculate the decay factor based on when the most recent review was.
 * If no review in 14+ days, score decays toward 5.0 (neutral).
 * Returns a factor from 0 (full decay) to 1 (no decay).
 */
export function calculateDecayFactor(lastReviewDate: string | null): number {
  if (!lastReviewDate) return 0;

  const daysSinceLastReview = differenceInDays(
    new Date(),
    new Date(lastReviewDate)
  );

  if (daysSinceLastReview < 14) return 1.0;
  if (daysSinceLastReview < 30) return 0.7;
  if (daysSinceLastReview < 60) return 0.4;
  return 0.1;
}

/**
 * Calculate the Live Score for a venue given its reviews.
 * Returns a score from 0.00 to 10.00.
 */
export function calculateLiveScore(reviews: ReviewData[]): number {
  if (reviews.length === 0) return 5.0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const review of reviews) {
    const weight = calculateFreshnessWeight(review.published_at);
    // Map sentiment from [-1, 1] to [0, 10]
    const mappedScore = (review.sentiment + 1) * 5;
    weightedSum += mappedScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 5.0;

  const rawScore = weightedSum / totalWeight;

  // Apply decay factor
  const sortedDates = reviews
    .map((r) => r.published_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const decay = calculateDecayFactor(sortedDates[0] ?? null);

  // Decay pulls the score toward 5.0 (neutral)
  const decayedScore = rawScore * decay + 5.0 * (1 - decay);

  return Math.round(decayedScore * 100) / 100;
}
