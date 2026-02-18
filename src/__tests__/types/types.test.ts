import { describe, it, expect } from "vitest";
import type {
  VenueListItem,
  VenueDetail,
  VenueFilters,
  VenueCategory,
} from "@/types/venue";
import type {
  DashboardData,
  ScoreHistoryPoint,
  Complaint,
  ActionPlanItem,
  DistrictComparison,
} from "@/types/dashboard";

describe("Type contracts", () => {
  it("VenueListItem has required fields", () => {
    const venue: VenueListItem = {
      id: "1",
      name: "Test",
      slug: "test",
      category: { slug: "cafe", name: "Кафе", icon: "☕", color: "#fff" },
      address: "ул. Тест 1",
      latitude: 43.238,
      longitude: 76.945,
      liveScore: 7.5,
      photoUrls: [],
      tags: ["wifi"],
      isActive: true,
    };
    expect(venue.id).toBe("1");
    expect(venue.liveScore).toBeGreaterThanOrEqual(0);
  });

  it("VenueDetail extends VenueListItem", () => {
    const detail: VenueDetail = {
      id: "1",
      name: "Test",
      slug: "test",
      category: { slug: "cafe", name: "Кафе", icon: "☕", color: "#fff" },
      address: "ул. Тест 1",
      latitude: 43.238,
      longitude: 76.945,
      liveScore: 7.5,
      photoUrls: [],
      tags: ["wifi"],
      isActive: true,
      description: "desc",
      aiDescription: null,
      phone: null,
      whatsapp: null,
      workingHours: null,
      tagDetails: [{ slug: "wifi", name: "WiFi" }],
      recentReviews: [],
    };
    expect(detail.tagDetails).toHaveLength(1);
  });

  it("VenueFilters allows optional bounds", () => {
    const f1: VenueFilters = {};
    const f2: VenueFilters = {
      bounds: { swLat: 43, swLng: 76, neLat: 44, neLng: 77 },
      category: "cafe",
      minScore: 5,
      limit: 10,
    };
    expect(f1.bounds).toBeUndefined();
    expect(f2.bounds).toBeDefined();
  });

  it("VenueCategory has color and icon", () => {
    const c: VenueCategory = { slug: "bar", name: "Бар", icon: "🍺", color: "#3b82f6" };
    expect(c.icon).toBeTruthy();
    expect(c.color).toMatch(/^#/);
  });

  it("DashboardData contains all sections", () => {
    const history: ScoreHistoryPoint = { date: "2026-02-01", score: 7.5 };
    const complaint: Complaint = { topic: "Шум", percentage: 30, reviewCount: 5, trend: "stable" };
    const action: ActionPlanItem = { priority: 1, action: "Fix", expectedImpact: "+1", difficulty: "low" };
    const comparison: DistrictComparison = { venueScore: 8, districtAvg: 7, cityAvg: 6.5, rank: 2, totalInDistrict: 20 };

    const dashboard: DashboardData = {
      venue: { id: "1", name: "Test", liveScore: 8 },
      scoreHistory: [history],
      topComplaints: [complaint],
      actionPlan: [action],
      districtComparison: comparison,
    };

    expect(dashboard.venue.id).toBe("1");
    expect(dashboard.scoreHistory).toHaveLength(1);
    expect(dashboard.topComplaints[0].trend).toBe("stable");
  });
});
