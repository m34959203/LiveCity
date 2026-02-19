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
  google_maps: "Google Maps",
  tiktok: "TikTok",
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
              <span className="text-zinc-400">
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
