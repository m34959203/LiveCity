"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import { hasAddress } from "@/lib/format";
import type { DayPlan, PlanStep } from "@/services/planner.service";

const EXAMPLES = [
  "Семейный день с детьми 5 и 8 лет",
  "Романтический вечер для двоих",
  "Активный день с друзьями, бюджет средний",
  "Спокойный день: кофе, парк, ужин",
];

const GROUP_OPTIONS = ["семья с детьми", "пара", "друзья", "один"];
const BUDGET_OPTIONS = ["эконом", "средний", "премиум"];

function PlanStepCard({ step, index }: { step: PlanStep; index: number }) {
  return (
    <div className="relative flex gap-4 pb-8">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 h-full w-px bg-zinc-800" />

      {/* Time badge */}
      <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
        {index + 1}
      </div>

      <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-emerald-400">{step.time}</span>
          <span className="text-xs text-zinc-500">{step.duration}</span>
        </div>

        <div className="mb-2 flex items-center gap-3">
          <h4 className="font-medium text-white">{step.venue.name}</h4>
          <LiveScoreBadge score={step.venue.liveScore} size="sm" />
        </div>

        <p className="mb-1 text-xs text-zinc-500">
          {step.venue.category}{hasAddress(step.venue.address) ? ` — ${step.venue.address}` : ""}
        </p>
        <p className="text-sm text-zinc-300">{step.reason}</p>

        {step.tips && (
          <p className="mt-2 rounded-lg bg-zinc-800 p-2 text-xs text-zinc-400">
            {step.tips}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [query, setQuery] = useState("");
  const [groupType, setGroupType] = useState("");
  const [budget, setBudget] = useState("");
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlan = useCallback(
    async (q?: string) => {
      const text = q || query;
      if (!text.trim()) return;
      setLoading(true);
      setPlan(null);

      try {
        const res = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: text.trim(),
            preferences: {
              groupType: groupType || undefined,
              budget: budget || undefined,
            },
          }),
        });
        const data = await res.json();
        if (data.data) setPlan(data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [query, groupType, budget],
  );

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
            <span className="text-sm text-zinc-400">AI-планировщик</span>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
          >
            Карта
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-2xl font-bold">Спланируй свой день</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Опиши, как хочешь провести день — AI построит оптимальный маршрут по Алматы.
        </p>

        {/* Input */}
        <div className="mb-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: хочу провести день с семьёй, дети 5 и 8 лет, хотим погулять и вкусно поесть..."
            rows={3}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Preferences */}
        <div className="mb-4 flex flex-wrap gap-2">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupType(groupType === g ? "" : g)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                groupType === g
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
          <span className="mx-1 text-zinc-700">|</span>
          {BUDGET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(budget === b ? "" : b)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                budget === b
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Example chips */}
        {!query && (
          <div className="mb-6 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex);
                  handlePlan(ex);
                }}
                className="rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => handlePlan()}
          disabled={loading || !query.trim()}
          className="mb-8 w-full rounded-xl bg-emerald-600 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
        >
          {loading ? "AI планирует..." : "Построить маршрут"}
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
          </div>
        )}

        {/* Plan Result */}
        {plan && !loading && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold">{plan.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                <span>{plan.totalDuration}</span>
                <span>{plan.estimatedBudget}</span>
              </div>
            </div>

            <div>
              {plan.steps.map((step, i) => (
                <PlanStepCard key={step.venue.id} step={step} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
