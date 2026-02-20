"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import { hasAddress } from "@/lib/format";

interface VenueItem {
  id: string;
  name: string;
  liveScore: number;
  category: { slug: string; name: string; color: string };
  address: string;
}

export default function InsightsListPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/venues?limit=100")
      .then((r) => r.json())
      .then((res) => setVenues(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            <span className="text-sm text-zinc-400">Инсайты для бизнеса</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Дашборд
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Карта
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-2xl font-bold">Бесплатные AI-инсайты</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Выберите заведение и получите бесплатный анализ от AI: что мешает расти
          и как это исправить.
        </p>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-zinc-900"
              />
            ))}
          </div>
        )}

        {!loading && venues.length === 0 && (
          <p className="text-zinc-500">Нет заведений. Запустите npm run db:seed.</p>
        )}

        {!loading && venues.length > 0 && (
          <div className="space-y-2">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/insights/${v.id}`}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <LiveScoreBadge score={v.liveScore} size="sm" />
                <div className="flex-1">
                  <p className="font-medium text-white">{v.name}</p>
                  {hasAddress(v.address) && (
                    <p className="text-xs text-zinc-500">{v.address}</p>
                  )}
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: v.category.color + "20",
                    color: v.category.color,
                  }}
                >
                  {v.category.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
