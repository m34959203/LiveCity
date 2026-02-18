"use client";

import type { Complaint } from "@/types/dashboard";

interface ComplaintsListProps {
  complaints: Complaint[];
}

const trendLabels = {
  rising: { text: "Растёт", color: "text-red-400" },
  stable: { text: "Стабильно", color: "text-zinc-400" },
  declining: { text: "Снижается", color: "text-emerald-400" },
};

export function ComplaintsList({ complaints }: ComplaintsListProps) {
  if (complaints.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-200">
          Топ жалоб за неделю
        </h3>
        <p className="text-sm text-zinc-500">Нет жалоб — отличный результат!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">
        Топ жалоб за неделю
      </h3>
      <div className="space-y-3">
        {complaints.map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-zinc-300">{c.topic}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-zinc-500">{c.reviewCount} отзывов</span>
                <span className={trendLabels[c.trend].color}>
                  {trendLabels[c.trend].text}
                </span>
              </div>
            </div>
            <div className="ml-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
              {c.percentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
