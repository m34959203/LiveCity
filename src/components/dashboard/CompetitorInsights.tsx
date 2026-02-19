"use client";

import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";

interface CompetitorVenue {
  id: string;
  name: string;
  liveScore: number;
  address: string;
  distance: number;
}

interface CompetitorData {
  competitors: CompetitorVenue[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  summary: string;
}

interface CompetitorInsightsProps {
  data: CompetitorData;
}

export function CompetitorInsights({ data }: CompetitorInsightsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">
        Конкурентная разведка
      </h3>

      {/* Summary */}
      {data.summary && (
        <p className="mb-4 rounded-lg bg-zinc-800 p-3 text-sm text-zinc-300">
          {data.summary}
        </p>
      )}

      {/* Competitors list */}
      {data.competitors.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-zinc-500">
            Конкуренты в радиусе 2 км
          </p>
          {data.competitors.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <LiveScoreBadge score={c.liveScore} size="sm" />
                <span className="text-zinc-300">{c.name}</span>
              </div>
              <span className="text-xs text-zinc-500">
                {c.distance.toFixed(1)} км
              </span>
            </div>
          ))}
        </div>
      )}

      {/* SWOT grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-emerald-400">Сильные</p>
          <ul className="space-y-1">
            {data.strengths.map((s, i) => (
              <li key={i} className="text-xs text-zinc-400">
                + {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-red-400">Слабые</p>
          <ul className="space-y-1">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-zinc-400">
                - {w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-amber-400">
            Возможности
          </p>
          <ul className="space-y-1">
            {data.opportunities.map((o, i) => (
              <li key={i} className="text-xs text-zinc-400">
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
