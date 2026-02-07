import { cn, formatScore, getScoreColor, getScoreBgColor } from "@/lib/utils";

interface LiveScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function LiveScoreBadge({
  score,
  size = "md",
  showLabel = false,
}: LiveScoreBadgeProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold text-white",
          getScoreBgColor(score),
          sizeClasses[size]
        )}
      >
        {formatScore(score)}
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", getScoreColor(score))}>
          Live Score
        </span>
      )}
    </div>
  );
}
