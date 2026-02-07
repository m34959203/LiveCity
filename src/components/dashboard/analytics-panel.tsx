"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Lightbulb } from "lucide-react";

// Demo data — will be replaced with real API data
const weeklyData = [
  { day: "Пн", positive: 5, negative: 1 },
  { day: "Вт", positive: 3, negative: 2 },
  { day: "Ср", positive: 7, negative: 0 },
  { day: "Чт", positive: 4, negative: 3 },
  { day: "Пт", positive: 8, negative: 1 },
  { day: "Сб", positive: 12, negative: 2 },
  { day: "Вс", positive: 10, negative: 1 },
];

const aiInsights = [
  "За последние 3 дня 4 жалобы на 'долгое обслуживание' — проверьте нагрузку на персонал.",
  "Конкурент 'CoffeeBoom' запустил сезонное меню — рассмотрите обновление.",
  "Отзывы хвалят атмосферу (+85% позитивных упоминаний) — используйте это в маркетинге.",
];

export function AnalyticsPanel() {
  return (
    <div className="space-y-4">
      {/* Sentiment chart */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Тональность за неделю</h2>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
              <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} />
              <Tooltip
                contentStyle={{
                  background: "#111118",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="positive" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Action Plan */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold">AI-рекомендации</h2>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Pro
          </span>
        </div>
        <div className="divide-y divide-border">
          {aiInsights.map((insight, i) => (
            <div key={i} className="flex gap-3 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
