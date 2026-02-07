"use client";

import { TrendingUp, TrendingDown, Star, MessageSquare, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

function StatCard({ title, value, change, trend, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {change && (
          <span
            className={cn(
              "mb-0.5 flex items-center gap-0.5 text-xs font-medium",
              trend === "up" && "text-emerald-500",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export function DashboardOverview() {
  // TODO: Fetch real data from API
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Live Score"
        value="8.4"
        change="+0.3 за неделю"
        trend="up"
        icon={<Star className="h-4 w-4" />}
      />
      <StatCard
        title="Отзывов за неделю"
        value="24"
        change="+8 от прошлой"
        trend="up"
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <StatCard
        title="Заявки на бронь"
        value="12"
        change="3 ожидают"
        trend="neutral"
        icon={<CalendarCheck className="h-4 w-4" />}
      />
      <StatCard
        title="Рейтинг vs конкуренты"
        value="#2"
        change="из 15 в категории"
        trend="neutral"
        icon={<TrendingUp className="h-4 w-4" />}
      />
    </div>
  );
}
