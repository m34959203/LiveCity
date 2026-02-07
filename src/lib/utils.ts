import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a color class based on the Live Score value (0-10).
 * Green for high, yellow for mid, red for low.
 */
export function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-yellow-500";
  if (score >= 4) return "text-orange-500";
  return "text-red-500";
}

export function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-yellow-500";
  if (score >= 4) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Format a Live Score for display (e.g., 8.50 -> "8.5")
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Generate a WhatsApp link with pre-filled message
 */
export function whatsappLink(phone: string, venueName: string): string {
  const message = encodeURIComponent(
    `Привет! Хочу забронировать место в "${venueName}" через LiveCity.`
  );
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`;
}
