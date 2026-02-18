import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionPlan } from "@/components/dashboard/ActionPlan";
import type { ActionPlanItem } from "@/types/dashboard";

const mockActions: ActionPlanItem[] = [
  { priority: 1, action: "Ускорить обслуживание", expectedImpact: "+1 к рейтингу", difficulty: "low" },
  { priority: 2, action: "Обновить меню", expectedImpact: "Привлечение новых клиентов", difficulty: "medium" },
  { priority: 3, action: "Ремонт интерьера", expectedImpact: "Улучшение атмосферы", difficulty: "high" },
];

describe("ActionPlan", () => {
  it("renders all actions", () => {
    render(<ActionPlan actions={mockActions} />);
    expect(screen.getByText("Ускорить обслуживание")).toBeInTheDocument();
    expect(screen.getByText("Обновить меню")).toBeInTheDocument();
    expect(screen.getByText("Ремонт интерьера")).toBeInTheDocument();
  });

  it("renders priority numbers", () => {
    const { container } = render(<ActionPlan actions={mockActions} />);
    const badges = container.querySelectorAll(".rounded-full.bg-emerald-600");
    expect(badges).toHaveLength(3);
    expect(badges[0].textContent).toBe("1");
    expect(badges[1].textContent).toBe("2");
    expect(badges[2].textContent).toBe("3");
  });

  it("renders expected impact texts", () => {
    render(<ActionPlan actions={mockActions} />);
    expect(screen.getByText("+1 к рейтингу")).toBeInTheDocument();
    expect(screen.getByText("Привлечение новых клиентов")).toBeInTheDocument();
  });

  it("renders difficulty badges in Russian", () => {
    render(<ActionPlan actions={mockActions} />);
    expect(screen.getByText("Легко")).toBeInTheDocument();
    expect(screen.getByText("Средне")).toBeInTheDocument();
    expect(screen.getByText("Сложно")).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(<ActionPlan actions={mockActions} />);
    expect(screen.getByText("AI-план действий")).toBeInTheDocument();
  });
});
