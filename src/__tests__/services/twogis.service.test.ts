import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { TwoGisService } from "@/services/twogis.service";

// Helper to mock global fetch
function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
  });
}

describe("TwoGisService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchVenue", () => {
    it("returns venue info for a valid match", async () => {
      const catalogResponse = {
        result: {
          items: [
            {
              id: "70000001234567",
              name: "Кофейня Арома",
              address_name: "ул. Абая, 10",
              point: { lat: 43.238, lon: 76.945 },
              reviews: { general_rating: 4.5, general_review_count: 120 },
              contact_groups: [
                {
                  contacts: [
                    { type: "phone", value: "+7 727 123 4567" },
                    { type: "email", value: "info@aroma.kz" },
                    { type: "website", value: "aroma.kz", url: "https://aroma.kz" },
                    { type: "whatsapp", value: "+77271234567" },
                    { type: "instagram", value: "aroma_almaty", text: "aroma_almaty" },
                    { type: "vkontakte", value: "aroma_vk", url: "https://vk.com/aroma" },
                    { type: "telegram", value: "aroma_tg", url: "https://t.me/aroma" },
                  ],
                },
              ],
              schedule: {
                Mon: { working_hours: [{ from: "09:00", to: "22:00" }] },
                Tue: { working_hours: [{ from: "09:00", to: "22:00" }] },
              },
              external_content: [
                { main_photo_url: "https://cdn.2gis.com/photo1.jpg" },
              ],
              rubrics: [
                { name: "Кофейня" },
                { name: "Кафе" },
              ],
              attribute_groups: [
                {
                  rubric_name: "Кофейня",
                  attributes: [
                    { name: "Wi-Fi" },
                    { name: "Парковка" },
                  ],
                },
              ],
            },
          ],
        },
      };

      global.fetch = mockFetch(catalogResponse);

      const result = await TwoGisService.searchVenue(
        "Кофейня Арома",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).not.toBeNull();
      expect(result!.twoGisId).toBe("70000001234567");
      expect(result!.name).toBe("Кофейня Арома");
      expect(result!.address).toBe("ул. Абая, 10");
      expect(result!.twoGisUrl).toBe("https://2gis.kz/firm/70000001234567");
      expect(result!.lat).toBe(43.238);
      expect(result!.lng).toBe(76.945);
      // Rating
      expect(result!.rating).toBe(4.5);
      expect(result!.reviewCount).toBe(120);
      // Contacts
      expect(result!.phone).toBe("+7 727 123 4567");
      expect(result!.email).toBe("info@aroma.kz");
      expect(result!.website).toBe("https://aroma.kz");
      expect(result!.whatsapp).toBe("+77271234567");
      expect(result!.instagram).toBe("aroma_almaty");
      expect(result!.vk).toBe("https://vk.com/aroma");
      expect(result!.telegram).toBe("https://t.me/aroma");
      // Schedule
      expect(result!.workingHours).toEqual({
        пн: "09:00–22:00",
        вт: "09:00–22:00",
      });
      // Photo
      expect(result!.photoUrl).toBe("https://cdn.2gis.com/photo1.jpg");
      // Rubrics
      expect(result!.rubrics).toEqual(["Кофейня", "Кафе"]);
      // Features
      expect(result!.features).toEqual(["Wi-Fi", "Парковка"]);
    });

    it("returns venue with minimal data (missing optional fields)", async () => {
      const catalogResponse = {
        result: {
          items: [
            {
              id: "70000009999999",
              name: "Простое Кафе",
              point: { lat: 43.24, lon: 76.95 },
            },
          ],
        },
      };

      global.fetch = mockFetch(catalogResponse);

      const result = await TwoGisService.searchVenue(
        "Простое Кафе",
        43.24,
        76.95,
        "Алматы",
      );

      expect(result).not.toBeNull();
      expect(result!.twoGisId).toBe("70000009999999");
      expect(result!.name).toBe("Простое Кафе");
      expect(result!.address).toBe("");
      expect(result!.phone).toBeNull();
      expect(result!.email).toBeNull();
      expect(result!.website).toBeNull();
      expect(result!.whatsapp).toBeNull();
      expect(result!.instagram).toBeNull();
      expect(result!.vk).toBeNull();
      expect(result!.telegram).toBeNull();
      expect(result!.workingHours).toBeNull();
      expect(result!.photoUrl).toBeNull();
      expect(result!.rating).toBeNull();
      expect(result!.reviewCount).toBe(0);
      expect(result!.rubrics).toEqual([]);
      expect(result!.features).toEqual([]);
    });

    it("returns null when no items found", async () => {
      global.fetch = mockFetch({ result: { items: [] } });

      const result = await TwoGisService.searchVenue(
        "Несуществующее Кафе",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).toBeNull();
    });

    it("returns null on HTTP error", async () => {
      global.fetch = mockFetch({}, false, 500);

      const result = await TwoGisService.searchVenue(
        "Test",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await TwoGisService.searchVenue(
        "Test",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).toBeNull();
    });

    it("rejects low-quality matches (score < 0.3)", async () => {
      const catalogResponse = {
        result: {
          items: [
            {
              id: "1",
              name: "Совершенно Другое Место XYZ",
              point: { lat: 50.0, lon: 80.0 }, // far away
            },
          ],
        },
      };

      global.fetch = mockFetch(catalogResponse);

      const result = await TwoGisService.searchVenue(
        "Кофейня Арома",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).toBeNull();
    });

    it("picks the best match among multiple candidates", async () => {
      const catalogResponse = {
        result: {
          items: [
            {
              id: "wrong",
              name: "Бургер Хаус",
              point: { lat: 43.24, lon: 76.95 },
            },
            {
              id: "correct",
              name: "Кофейня Арома",
              point: { lat: 43.238, lon: 76.945 },
            },
          ],
        },
      };

      global.fetch = mockFetch(catalogResponse);

      const result = await TwoGisService.searchVenue(
        "Кофейня Арома",
        43.238,
        76.945,
        "Алматы",
      );

      expect(result).not.toBeNull();
      expect(result!.twoGisId).toBe("correct");
    });

    it("uses photos fallback when no external_content", async () => {
      const catalogResponse = {
        result: {
          items: [
            {
              id: "photo_test",
              name: "Фото Кафе",
              point: { lat: 43.24, lon: 76.95 },
              photos: [{ url: "https://cdn.2gis.com/fallback.jpg" }],
            },
          ],
        },
      };

      global.fetch = mockFetch(catalogResponse);

      const result = await TwoGisService.searchVenue(
        "Фото Кафе",
        43.24,
        76.95,
        "Алматы",
      );

      expect(result).not.toBeNull();
      expect(result!.photoUrl).toBe("https://cdn.2gis.com/fallback.jpg");
    });
  });

  describe("fetchReviews", () => {
    it("returns parsed reviews", async () => {
      const reviewsResponse = {
        reviews: [
          {
            text: "Отличное место, хороший кофе!",
            rating: 5,
            user: { name: "Айдос" },
            date_edited: "2025-06-01T12:00:00",
          },
          {
            text: "Средний сервис, долго ждали",
            rating: 3,
            user: { name: "Мария" },
            date_created: "2025-05-28T10:00:00",
          },
        ],
      };

      global.fetch = mockFetch(reviewsResponse);

      const reviews = await TwoGisService.fetchReviews("70000001234567", 10);

      expect(reviews).toHaveLength(2);
      expect(reviews[0].text).toBe("Отличное место, хороший кофе!");
      expect(reviews[0].rating).toBe(5);
      expect(reviews[0].author).toBe("Айдос");
      expect(reviews[0].date).toBe("2025-06-01T12:00:00");
      expect(reviews[1].author).toBe("Мария");
    });

    it("filters out short reviews (< 6 chars)", async () => {
      const reviewsResponse = {
        reviews: [
          { text: "Ок", rating: 3, user: { name: "A" } },
          { text: "Хорошее место для обеда", rating: 4, user: { name: "B" } },
        ],
      };

      global.fetch = mockFetch(reviewsResponse);

      const reviews = await TwoGisService.fetchReviews("123");

      expect(reviews).toHaveLength(1);
      expect(reviews[0].text).toBe("Хорошее место для обеда");
    });

    it("returns empty array on HTTP error", async () => {
      global.fetch = mockFetch({}, false, 403);

      const reviews = await TwoGisService.fetchReviews("123");

      expect(reviews).toEqual([]);
    });

    it("handles missing user name gracefully", async () => {
      const reviewsResponse = {
        reviews: [
          { text: "Хороший ресторан, рекомендую", rating: 5, user: {} },
        ],
      };

      global.fetch = mockFetch(reviewsResponse);

      const reviews = await TwoGisService.fetchReviews("123");

      expect(reviews[0].author).toBe("Гость");
    });
  });

  describe("getVenueWithReviews", () => {
    it("returns venue + reviews in one call", async () => {
      // First call: catalog search
      // Second call: reviews fetch
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                result: {
                  items: [
                    {
                      id: "venue123",
                      name: "Test Cafe",
                      address_name: "Test St 1",
                      point: { lat: 43.0, lon: 77.0 },
                    },
                  ],
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reviews: [
                { text: "Супер, отличный кофе и десерты!", rating: 5, user: { name: "User" } },
              ],
            }),
        });
      });

      const result = await TwoGisService.getVenueWithReviews(
        "Test Cafe",
        43.0,
        77.0,
        "Алматы",
      );

      expect(result).not.toBeNull();
      expect(result!.venue.twoGisId).toBe("venue123");
      expect(result!.venue.twoGisUrl).toBe("https://2gis.kz/firm/venue123");
      expect(result!.venue.rubrics).toEqual([]);
      expect(result!.venue.features).toEqual([]);
      expect(result!.reviews).toHaveLength(1);
    });

    it("returns null when venue not found", async () => {
      global.fetch = mockFetch({ result: { items: [] } });

      const result = await TwoGisService.getVenueWithReviews(
        "Nonexistent",
        0,
        0,
        "Алматы",
      );

      expect(result).toBeNull();
    });
  });
});
