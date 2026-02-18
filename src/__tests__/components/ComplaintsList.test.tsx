import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplaintsList } from "@/components/dashboard/ComplaintsList";
import type { Complaint } from "@/types/dashboard";

const mockComplaints: Complaint[] = [
  { topic: "Медленное обслуживание", percentage: 40, reviewCount: 12, trend: "rising" },
  { topic: "Высокие цены", percentage: 25, reviewCount: 8, trend: "stable" },
];

describe("ComplaintsList", () => {
  it("renders success message when no complaints", () => {
    render(<ComplaintsList complaints={[]} />);
    expect(screen.getByText(/нет жалоб/i)).toBeInTheDocument();
  });

  it("renders complaint topics", () => {
    render(<ComplaintsList complaints={mockComplaints} />);
    expect(screen.getByText("Медленное обслуживание")).toBeInTheDocument();
    expect(screen.getByText("Высокие цены")).toBeInTheDocument();
  });

  it("renders review counts", () => {
    render(<ComplaintsList complaints={mockComplaints} />);
    expect(screen.getByText(/12 отзывов/)).toBeInTheDocument();
    expect(screen.getByText(/8 отзывов/)).toBeInTheDocument();
  });

  it("renders percentage badges", () => {
    render(<ComplaintsList complaints={mockComplaints} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders trend labels", () => {
    render(<ComplaintsList complaints={mockComplaints} />);
    expect(screen.getByText("Растёт")).toBeInTheDocument();
    expect(screen.getByText("Стабильно")).toBeInTheDocument();
  });
});
