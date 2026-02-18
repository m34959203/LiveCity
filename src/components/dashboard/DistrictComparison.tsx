"use client";

import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import type { DistrictComparison as DistrictComparisonType } from "@/types/dashboard";

interface DistrictComparisonProps {
  data: DistrictComparisonType;
}

export function DistrictComparison({ data }: DistrictComparisonProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">
        Сравнение с районом
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="mb-2 text-xs text-zinc-500">Ваш Score</p>
          <LiveScoreBadge score={data.venueScore} size="md" />
        </div>
        <div>
          <p className="mb-2 text-xs text-zinc-500">Район (ср.)</p>
          <LiveScoreBadge score={data.districtAvg} size="md" />
        </div>
        <div>
          <p className="mb-2 text-xs text-zinc-500">Город (ср.)</p>
          <LiveScoreBadge score={data.cityAvg} size="md" />
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Место #{data.rank} из {data.totalInDistrict} в районе
      </p>
    </div>
  );
}
