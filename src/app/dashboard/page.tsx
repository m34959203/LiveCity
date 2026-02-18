"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { ComplaintsList } from "@/components/dashboard/ComplaintsList";
import { ActionPlan } from "@/components/dashboard/ActionPlan";
import { DistrictComparison } from "@/components/dashboard/DistrictComparison";
import type { DashboardData } from "@/types/dashboard";

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-zinc-800" />
        <div>
          <div className="mb-2 h-6 w-48 rounded bg-zinc-800" />
          <div className="h-4 w-24 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-72 rounded-xl bg-zinc-900 md:col-span-2" />
        <div className="h-48 rounded-xl bg-zinc-900" />
        <div className="h-48 rounded-xl bg-zinc-900" />
        <div className="h-56 rounded-xl bg-zinc-900 md:col-span-2" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      .catch((e: Error) => setError(e.message || "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
              <span className="text-sm font-bold">LiveCity</span>
            </Link>
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <span className="hidden text-sm text-zinc-400 sm:inline">
              Бизнес-дашборд
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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {loading && <DashboardSkeleton />}

        {data && !loading && (
          <>
            {/* Venue Header */}
            <div className="mb-8 flex items-center gap-4">
              <LiveScoreBadge score={data.venue.liveScore} size="lg" />
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  {data.venue.name}
                </h1>
                <p className="text-sm text-zinc-500">
                  ID: {venueId.slice(0, 8)}...
                </p>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
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
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-500">
            <div className="h-12 w-12 rounded-full bg-zinc-800 p-3 text-zinc-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v3m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <p className="font-medium">
              {error || "Нет данных для отображения"}
            </p>
            <p className="text-xs">Запустите seed данных: npm run db:seed</p>
          </div>
        )}
      </main>
    </div>
  );
}
