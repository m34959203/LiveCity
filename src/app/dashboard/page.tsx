"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { ComplaintsList } from "@/components/dashboard/ComplaintsList";
import { ActionPlan } from "@/components/dashboard/ActionPlan";
import { DistrictComparison } from "@/components/dashboard/DistrictComparison";
import { SocialPulse } from "@/components/dashboard/SocialPulse";
import { CompetitorInsights } from "@/components/dashboard/CompetitorInsights";
import type { DashboardData } from "@/types/dashboard";

interface SocialPulseData {
  totalMentions: number;
  avgSentiment: number;
  trend: "rising" | "stable" | "declining";
  sources: { source: string; mentions: number; sentiment: number }[];
}

interface CompetitorData {
  competitors: {
    id: string;
    name: string;
    liveScore: number;
    address: string;
    distance: number;
  }[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  summary: string;
}

interface VenueOption {
  id: string;
  name: string;
  liveScore: number;
}

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
        <div className="h-48 rounded-xl bg-zinc-900" />
        <div className="h-48 rounded-xl bg-zinc-900" />
        <div className="h-56 rounded-xl bg-zinc-900 md:col-span-2" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950"><DashboardSkeleton /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pulse, setPulse] = useState<SocialPulseData | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string>("");
  const [venueOptions, setVenueOptions] = useState<VenueOption[]>([]);

  const loadDashboard = useCallback(async (id: string) => {
    setVenueId(id);
    setLoading(true);
    setData(null);
    setPulse(null);
    setCompetitors(null);

    try {
      const [dashRes, pulseRes, compRes] = await Promise.all([
        fetch(`/api/dashboard/${id}`).then((r) => r.json()),
        fetch(`/api/venues/${id}/pulse`).then((r) => r.json()),
        fetch(`/api/dashboard/${id}/competitors`).then((r) => r.json()),
      ]);

      if (dashRes.data) setData(dashRes.data);
      if (pulseRes.data) setPulse(pulseRes.data);
      if (compRes.data) setCompetitors(compRes.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load venue list for selector
  useEffect(() => {
    fetch("/api/venues?limit=100")
      .then((r) => r.json())
      .then((res) => {
        const venues = (res.data || []).map(
          (v: { id: string; name: string; liveScore: number }) => ({
            id: v.id,
            name: v.name,
            liveScore: v.liveScore,
          }),
        );
        setVenueOptions(venues);
      })
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    const qsVenueId = searchParams.get("venueId");

    const init = async () => {
      try {
        if (qsVenueId) {
          await loadDashboard(qsVenueId);
        } else if (venueOptions.length > 0) {
          await loadDashboard(venueOptions[0].id);
        } else {
          const res = await fetch("/api/venues?limit=1");
          const json = await res.json();
          const id = json.data?.[0]?.id;
          if (id) await loadDashboard(id);
          else throw new Error("No venues");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      }
    };

    init();
  }, [searchParams, loadDashboard, venueOptions]);

  const handleVenueSwitch = useCallback(
    (id: string) => {
      router.push(`/dashboard?venueId=${id}`);
    },
    [router],
  );

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
          <div className="flex items-center gap-2">
            <Link
              href="/planner"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Планировщик
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

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Venue Selector */}
        {venueOptions.length > 1 && (
          <div className="mb-6">
            <label className="mb-1 block text-xs text-zinc-500">
              Выберите заведение
            </label>
            <select
              value={venueId}
              onChange={(e) => handleVenueSwitch(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none sm:w-auto sm:min-w-[300px]"
            >
              {venueOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.liveScore.toFixed(1)}
                </option>
              ))}
            </select>
          </div>
        )}

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
              {/* Score chart — full width */}
              <div className="md:col-span-2">
                <ScoreChart data={data.scoreHistory} />
              </div>

              {/* Social Pulse */}
              {pulse && <SocialPulse data={pulse} />}

              {/* District Comparison */}
              <DistrictComparison data={data.districtComparison} />

              {/* Complaints */}
              <ComplaintsList complaints={data.topComplaints} />

              {/* Action Plan */}
              <ActionPlan actions={data.actionPlan} />

              {/* Competitor Insights — full width */}
              {competitors && (
                <div className="md:col-span-2">
                  <CompetitorInsights data={competitors} />
                </div>
              )}
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-500">
            <div className="h-12 w-12 rounded-full bg-zinc-800 p-3 text-zinc-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
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
