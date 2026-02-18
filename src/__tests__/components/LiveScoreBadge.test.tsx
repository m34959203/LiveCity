import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";

describe("LiveScoreBadge", () => {
  it("renders score with one decimal", () => {
    render(<LiveScoreBadge score={8.5} />);
    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("applies emerald color for high scores (>=8)", () => {
    const { container } = render(<LiveScoreBadge score={9} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-emerald-500");
  });

  it("applies amber color for medium scores (>=5)", () => {
    const { container } = render(<LiveScoreBadge score={6} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-amber-500");
  });

  it("applies zinc color for low scores (<5)", () => {
    const { container } = render(<LiveScoreBadge score={3} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-zinc-500");
  });

  it("renders sm size", () => {
    const { container } = render(<LiveScoreBadge score={7} size="sm" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("h-7");
  });

  it("renders lg size", () => {
    const { container } = render(<LiveScoreBadge score={7} size="lg" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("h-14");
  });
});
