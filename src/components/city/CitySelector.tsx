"use client";

import { CITIES, type CityConfig } from "@/lib/cities";

interface CitySelectorProps {
  onSelect: (city: CityConfig) => void;
}

export function CitySelector({ onSelect }: CitySelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/98">
      <div className="mx-4 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
          <h1 className="text-2xl font-bold text-white">LiveCity</h1>
          <p className="text-sm text-zinc-400">
            Выберите город
          </p>
        </div>

        {/* City grid */}
        <div className="flex flex-col gap-2">
          {CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => onSelect(city)}
              className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5 text-left transition-all hover:border-emerald-500/50 hover:bg-zinc-800/80"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg transition-colors group-hover:bg-emerald-500/20">
                {getCityIcon(city.id)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {city.name}
                </div>
                <div className="text-xs text-zinc-500">
                  {getCityDescription(city.id)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCityIcon(id: string): string {
  const icons: Record<string, string> = {
    almaty: "\u{1F3D4}",
    astana: "\u{1F3DB}",
    shymkent: "\u{2600}",
    karaganda: "\u{26CF}",
    jezkazgan: "\u{1F3ED}",
  };
  return icons[id] || "\u{1F3D9}";
}

function getCityDescription(id: string): string {
  const descriptions: Record<string, string> = {
    almaty: "Южная столица",
    astana: "Столица Казахстана",
    shymkent: "Город на юге",
    karaganda: "Центральный Казахстан",
    jezkazgan: "Город металлургов",
  };
  return descriptions[id] || "";
}
