import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DistrictComparison } from "@/components/dashboard/DistrictComparison";
import type { DistrictComparison as DistrictComparisonType } from "@/types/dashboard";

const mockData: DistrictComparisonType = {
  venueScore: 8.2,
  districtAvg: 6.5,
  cityAvg: 7.0,
  rank: 3,
  totalInDistrict: 25,
};

describe("DistrictComparison", () => {
  it("renders all three scores", () => {
    render(<DistrictComparison data={mockData} />);
    expect(screen.getByText("8.2")).toBeInTheDocument();
    expect(screen.getByText("6.5")).toBeInTheDocument();
    expect(screen.getByText("7.0")).toBeInTheDocument();
  });

  it("renders score labels", () => {
    render(<DistrictComparison data={mockData} />);
    expect(screen.getByText("Ваш Score")).toBeInTheDocument();
    expect(screen.getByText("Район (ср.)")).toBeInTheDocument();
    expect(screen.getByText("Город (ср.)")).toBeInTheDocument();
  });

  it("renders rank info", () => {
    render(<DistrictComparison data={mockData} />);
    const rankEl = screen.getByText(/место/i);
    expect(rankEl.textContent).toContain("3");
    expect(rankEl.textContent).toContain("25");
  });

  it("renders heading", () => {
    render(<DistrictComparison data={mockData} />);
    expect(screen.getByText("Сравнение с районом")).toBeInTheDocument();
  });
});
