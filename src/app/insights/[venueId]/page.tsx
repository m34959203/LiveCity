"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import type { VenueInsight } from "@/services/insight.service";

function InsightSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-zinc-800" />
      <div className="h-24 rounded-xl bg-zinc-900" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 rounded-xl bg-zinc-900" />
        <div className="h-40 rounded-xl bg-zinc-900" />
        <div className="h-40 rounded-xl bg-zinc-900" />
      </div>
    </div>
  );
}

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

export default function InsightsPage() {
  const params = useParams<{ venueId: string }>();
  const [insight, setInsight] = useState<VenueInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.venueId) return;
    fetch(`/api/insights/${params.venueId}`)
      .then((r) => r.json())
      .then((res) => setInsight(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.venueId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
              <span className="text-sm font-bold">LiveCity</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">
              Бесплатный анализ
            </span>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
          >
            Карта
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {loading && <InsightSkeleton />}

        {insight && !loading && (
          <>
            {/* Venue Header */}
            <div className="mb-6 flex items-center gap-4">
              <LiveScoreBadge score={insight.venue.liveScore} size="lg" />
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  {insight.venue.name}
                </h1>
                <p className="text-sm text-zinc-500">
                  {insight.venue.category}
                </p>
              </div>
            </div>

            {/* Hook — the attention grabber */}
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-lg font-semibold text-amber-300">
                {insight.hook}
              </p>
              {insight.estimatedRevenueLoss && (
                <p className="mt-2 text-sm text-amber-400/70">
                  Потенциальные потери: {insight.estimatedRevenueLoss}/мес
                </p>
              )}
            </div>

            {/* Social Pulse */}
            <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-3 text-sm font-medium text-zinc-200">
                Социальный пульс
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {insight.pulse.totalMentions}
                  </p>
                  <p className="text-xs text-zinc-500">Упоминаний/нед</p>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${insight.pulse.avgSentiment > 0 ? "text-emerald-400" : insight.pulse.avgSentiment < -0.2 ? "text-red-400" : "text-zinc-300"}`}
                  >
                    {insight.pulse.avgSentiment > 0 ? "+" : ""}
                    {(insight.pulse.avgSentiment * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-zinc-500">Настроение</p>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${trendColor[insight.pulse.trend]}`}
                  >
                    {trendLabel[insight.pulse.trend]}
                  </p>
                  <p className="text-xs text-zinc-500">Тренд</p>
                </div>
              </div>
            </div>

            {/* Problems & Quick Wins */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-red-500/20 bg-zinc-900 p-4">
                <h3 className="mb-3 text-sm font-medium text-red-400">
                  Проблемы
                </h3>
                <ul className="space-y-2">
                  {insight.problems.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-zinc-300"
                    >
                      <span className="shrink-0 text-red-500">-</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-zinc-900 p-4">
                <h3 className="mb-3 text-sm font-medium text-emerald-400">
                  Быстрые решения
                </h3>
                <ul className="space-y-2">
                  {insight.quickWins.map((w, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-zinc-300"
                    >
                      <span className="shrink-0 text-emerald-500">+</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <p className="mb-2 text-lg font-semibold text-emerald-300">
                Хотите полный анализ и план действий?
              </p>
              <p className="mb-4 text-sm text-zinc-400">
                7 дней бесплатно. Конкурентная разведка, AI-рекомендации, отслеживание динамики.
              </p>
              <Link
                href={`/dashboard?venueId=${insight.venue.id}`}
                className="inline-block rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Попробовать бесплатно
              </Link>
            </div>
          </>
        )}

        {!insight && !loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-500">
            <p className="font-medium">Заведение не найдено</p>
          </div>
        )}
      </main>
    </div>
  );
}
