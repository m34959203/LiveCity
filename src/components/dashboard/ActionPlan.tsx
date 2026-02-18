"use client";

import type { ActionPlanItem } from "@/types/dashboard";

interface ActionPlanProps {
  actions: ActionPlanItem[];
}

const difficultyBadge = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-red-500/20 text-red-400",
};

const difficultyLabel = {
  low: "Легко",
  medium: "Средне",
  high: "Сложно",
};

export function ActionPlan({ actions }: ActionPlanProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">
        AI-план действий
      </h3>
      <div className="space-y-4">
        {actions.map((a) => (
          <div key={a.priority} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {a.priority}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{a.action}</p>
              <p className="mt-1 text-xs text-zinc-500">{a.expectedImpact}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${difficultyBadge[a.difficulty]}`}
              >
                {difficultyLabel[a.difficulty]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
