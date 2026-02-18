"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { ComplaintsList } from "@/components/dashboard/ComplaintsList";
import { ActionPlan } from "@/components/dashboard/ActionPlan";
import { DistrictComparison } from "@/components/dashboard/DistrictComparison";
import type { DashboardData } from "@/types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState<string>("");

  // On mount: load first venue for demo
  useEffect(() => {
    fetch("/api/venues?limit=1")
      .then((r) => r.json())
      .then((res) => {
        const id = res.data?.[0]?.id;
        if (id) {
          setVenueId(id);
          return fetch(`/api/dashboard/${id}`);
        }
        throw new Error("No venues");
      })
      .then((r) => r!.json())
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
              <span className="text-sm font-bold">LiveCity</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">Бизнес-дашборд</span>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
          >
            Карта
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* Venue Header */}
            <div className="mb-8 flex items-center gap-4">
              <LiveScoreBadge score={data.venue.liveScore} size="lg" />
              <div>
                <h1 className="text-2xl font-bold">{data.venue.name}</h1>
                <p className="text-sm text-zinc-500">
                  ID: {venueId.slice(0, 8)}...
                </p>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <ScoreChart data={data.scoreHistory} />
              </div>
              <ComplaintsList complaints={data.topComplaints} />
              <DistrictComparison data={data.districtComparison} />
              <div className="md:col-span-2">
                <ActionPlan actions={data.actionPlan} />
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-zinc-500">
            <p>Нет данных для отображения</p>
            <p className="text-xs">Запустите seed данных: npm run db:seed</p>
          </div>
        )}
      </main>
    </div>
  );
}
