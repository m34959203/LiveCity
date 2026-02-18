import { describe, it, expect } from "vitest";
import { ScoreService } from "@/services/score.service";

describe("ScoreService", () => {
  describe("calculateDemoScore", () => {
    it("returns a number between 0 and 10", () => {
      for (let i = 0; i < 100; i++) {
        const score = ScoreService.calculateDemoScore(5);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    });

    it("clamps score at 0 for very low base", () => {
      // With base 0 and possible negative modifiers, should still be >= 0
      for (let i = 0; i < 50; i++) {
        const score = ScoreService.calculateDemoScore(0);
        expect(score).toBeGreaterThanOrEqual(0);
      }
    });

    it("clamps score at 10 for very high base", () => {
      for (let i = 0; i < 50; i++) {
        const score = ScoreService.calculateDemoScore(10);
        expect(score).toBeLessThanOrEqual(10);
      }
    });

    it("rounds to one decimal place", () => {
      const score = ScoreService.calculateDemoScore(7);
      const decimals = score.toString().split(".")[1];
      expect(!decimals || decimals.length <= 1).toBe(true);
    });

    it("stays close to the base score", () => {
      const base = 6;
      const scores = Array.from({ length: 100 }, () =>
        ScoreService.calculateDemoScore(base),
      );
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      // Average should be within ~2 of base
      expect(avg).toBeGreaterThan(base - 2);
      expect(avg).toBeLessThan(base + 2);
    });
  });
});
