"use client";

interface LiveScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500 text-white";
  if (score >= 5) return "bg-amber-500 text-white";
  return "bg-zinc-500 text-white";
}

function getScoreRing(score: number): string {
  if (score >= 8) return "ring-emerald-500/30";
  if (score >= 5) return "ring-amber-500/30";
  return "ring-zinc-500/30";
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm font-semibold",
  lg: "h-14 w-14 text-lg font-bold",
};

export function LiveScoreBadge({ score, size = "md" }: LiveScoreBadgeProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ring-4 ${getScoreColor(score)} ${getScoreRing(score)} ${sizeMap[size]}`}
    >
      {score.toFixed(1)}
    </div>
  );
}
