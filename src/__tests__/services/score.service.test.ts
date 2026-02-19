import { describe, it, expect } from "vitest";

/**
 * Test the score normalization logic (extracted from SocialSignalService).
 * The actual calculateLiveScore is async and requires DB,
 * so we test the pure math formula here.
 */
function calculateScore(
  baseScore: number,
  totalMentions: number,
  avgSentiment: number,
  timeMod: number,
): number {
  const baseComponent = baseScore * 0.4;
  const activityScore = Math.min(10, (totalMentions / 50) * 10);
  const activityComponent = activityScore * 0.3;
  const sentimentScore = (avgSentiment + 1) * 5;
  const sentimentComponent = sentimentScore * 0.2;
  const timeComponent = timeMod * 0.1;

  const score =
    baseComponent + activityComponent + sentimentComponent + timeComponent;
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}

describe("Score calculation formula", () => {
  it("returns a number between 0 and 10", () => {
    for (let i = 0; i < 100; i++) {
      const base = Math.random() * 10;
      const mentions = Math.random() * 100;
      const sentiment = Math.random() * 2 - 1;
      const time = Math.random() * 10;
      const score = calculateScore(base, mentions, sentiment, time);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it("clamps at 0 for minimum inputs", () => {
    const score = calculateScore(0, 0, -1, 0);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("clamps at 10 for maximum inputs", () => {
    const score = calculateScore(10, 100, 1, 10);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("rounds to one decimal place", () => {
    const score = calculateScore(7, 30, 0.5, 5);
    const decimals = score.toString().split(".")[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });

  it("social signals impact the score", () => {
    const lowActivity = calculateScore(5, 0, 0, 5);
    const highActivity = calculateScore(5, 50, 0, 5);
    expect(highActivity).toBeGreaterThan(lowActivity);
  });

  it("sentiment impacts the score", () => {
    const negativeSentiment = calculateScore(5, 20, -0.8, 5);
    const positiveSentiment = calculateScore(5, 20, 0.8, 5);
    expect(positiveSentiment).toBeGreaterThan(negativeSentiment);
  });

  it("base score has 40% weight", () => {
    const low = calculateScore(2, 25, 0, 5);
    const high = calculateScore(8, 25, 0, 5);
    // Difference should be approximately (8-2)*0.4 = 2.4
    const diff = high - low;
    expect(diff).toBeGreaterThan(2);
    expect(diff).toBeLessThan(3);
  });
});
