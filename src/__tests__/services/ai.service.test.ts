import { describe, it, expect, vi } from "vitest";

// Mock gemini before importing AIService
vi.mock("@/lib/gemini", () => ({
  geminiModel: {
    generateContent: vi.fn(),
  },
}));

import { AIService } from "@/services/ai.service";
import { geminiModel } from "@/lib/gemini";
import type { VenueListItem } from "@/types/venue";

const mockVenues: VenueListItem[] = [
  {
    id: "v1",
    name: "Кофейня Арома",
    slug: "kofeynaya-aroma",
    category: { slug: "cafe", name: "Кафе", icon: "☕", color: "#f59e0b" },
    address: "ул. Абая 10",
    latitude: 43.238,
    longitude: 76.945,
    liveScore: 8.5,
    photoUrls: [],
    tags: ["wifi", "коворкинг"],
    isActive: true,
  },
  {
    id: "v2",
    name: "Ресторан Плов",
    slug: "restoran-plov",
    category: { slug: "restaurant", name: "Ресторан", icon: "🍽", color: "#ef4444" },
    address: "пр. Достык 50",
    latitude: 43.24,
    longitude: 76.95,
    liveScore: 7.2,
    photoUrls: [],
    tags: ["национальная кухня"],
    isActive: true,
  },
];

describe("AIService", () => {
  describe("semanticSearch", () => {
    it("returns parsed AI results on success", async () => {
      const aiResponse = {
        interpretation: "Пользователь ищет кофейню с WiFi",
        results: [
          { venueId: "v1", relevance: 0.95, reason: "Кофейня с WiFi и коворкинг-зоной" },
        ],
      };

      vi.mocked(geminiModel.generateContent).mockResolvedValueOnce({
        response: { text: () => JSON.stringify(aiResponse) },
      } as never);

      const result = await AIService.semanticSearch("кофейня с вайфаем", mockVenues);
      expect(result.interpretation).toBe("Пользователь ищет кофейню с WiFi");
      expect(result.results).toHaveLength(1);
      expect(result.results[0].venueId).toBe("v1");
    });

    it("falls back to text search on Gemini error", async () => {
      vi.mocked(geminiModel.generateContent).mockRejectedValueOnce(new Error("API error"));

      const result = await AIService.semanticSearch("кафе", mockVenues);
      expect(result.interpretation).toContain("кафе");
      expect(result.results.length).toBeGreaterThanOrEqual(0);
    });

    it("clamps relevance between 0 and 1", async () => {
      const aiResponse = {
        interpretation: "test",
        results: [{ venueId: "v1", relevance: 1.5, reason: "test" }],
      };

      vi.mocked(geminiModel.generateContent).mockResolvedValueOnce({
        response: { text: () => JSON.stringify(aiResponse) },
      } as never);

      const result = await AIService.semanticSearch("test", mockVenues);
      expect(result.results[0].relevance).toBeLessThanOrEqual(1);
    });
  });

  describe("generateActionPlan", () => {
    it("returns AI-generated plan", async () => {
      const plan = [
        { priority: 1, action: "Улучшить WiFi", expectedImpact: "+1 к рейтингу", difficulty: "low" },
      ];

      vi.mocked(geminiModel.generateContent).mockResolvedValueOnce({
        response: { text: () => JSON.stringify(plan) },
      } as never);

      const result = await AIService.generateActionPlan("Кафе", ["медленный WiFi"], 6);
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe("Улучшить WiFi");
    });

    it("returns fallback plan on error", async () => {
      vi.mocked(geminiModel.generateContent).mockRejectedValueOnce(new Error("fail"));

      const result = await AIService.generateActionPlan("Test", ["complaint"], 5);
      expect(result).toHaveLength(3);
      expect(result[0].priority).toBe(1);
    });
  });

  describe("groupComplaints", () => {
    it("returns empty array for no negative reviews", async () => {
      const result = await AIService.groupComplaints([
        { text: "Отлично!", sentiment: 0.8 },
      ]);
      expect(result).toEqual([]);
    });

    it("groups negative reviews via AI", async () => {
      const grouped = [
        { topic: "Медленное обслуживание", percentage: 60, reviewCount: 3, trend: "rising" },
      ];

      vi.mocked(geminiModel.generateContent).mockResolvedValueOnce({
        response: { text: () => JSON.stringify(grouped) },
      } as never);

      const result = await AIService.groupComplaints([
        { text: "Долго ждали", sentiment: -0.5 },
        { text: "Ужасный сервис", sentiment: -0.8 },
      ]);
      expect(result[0].topic).toBe("Медленное обслуживание");
    });
  });
});
