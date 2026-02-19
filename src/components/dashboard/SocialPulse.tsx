"use client";

interface SocialPulseData {
  totalMentions: number;
  avgSentiment: number;
  trend: "rising" | "stable" | "declining";
  sources: { source: string; mentions: number; sentiment: number }[];
}

interface SocialPulseProps {
  data: SocialPulseData;
}

const sourceLabels: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  "2gis": "2GIS",
};

const sourceIcons: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  "2gis": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  tiktok: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43 6.35 6.35 0 001.86-4.43V8.7a8.16 8.16 0 004.72 1.5v-3.5h-1z",
};

const sourceColors: Record<string, string> = {
  instagram: "text-pink-400",
  "2gis": "text-green-400",
  tiktok: "text-zinc-300",
};

const trendLabel = {
  rising: "Растёт",
  stable: "Стабильно",
  declining: "Падает",
};
const trendColor = {
  rising: "text-emerald-400",
  stable: "text-zinc-400",
  declining: "text-red-400",
};

export function SocialPulse({ data }: SocialPulseProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">
        Социальный пульс (7 дней)
      </h3>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">
            {data.totalMentions}
          </p>
          <p className="text-xs text-zinc-500">Упоминаний</p>
        </div>
        <div>
          <p
            className={`text-2xl font-bold ${data.avgSentiment > 0 ? "text-emerald-400" : data.avgSentiment < -0.2 ? "text-red-400" : "text-zinc-300"}`}
          >
            {data.avgSentiment > 0 ? "+" : ""}
            {(data.avgSentiment * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-zinc-500">Настроение</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${trendColor[data.trend]}`}>
            {trendLabel[data.trend]}
          </p>
          <p className="text-xs text-zinc-500">Тренд</p>
        </div>
      </div>

      {/* Per source */}
      {data.sources.length > 0 && (
        <div className="space-y-2">
          {data.sources.map((s) => (
            <div
              key={s.source}
              className="flex items-center justify-between text-sm"
            >
              <span className={`flex items-center gap-1.5 ${sourceColors[s.source] || "text-zinc-400"}`}>
                {sourceIcons[s.source] && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d={sourceIcons[s.source]} />
                  </svg>
                )}
                {sourceLabels[s.source] || s.source}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-300">{s.mentions} упом.</span>
                <span
                  className={
                    s.sentiment > 0 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {s.sentiment > 0 ? "+" : ""}
                  {(s.sentiment * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
