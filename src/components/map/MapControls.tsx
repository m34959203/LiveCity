"use client";

interface MapControlsProps {
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onGeolocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function MapControls({
  showHeatmap,
  onToggleHeatmap,
  onGeolocate,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900/90 text-zinc-300 backdrop-blur transition-colors hover:bg-zinc-800 hover:text-white";

  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
      {/* Heatmap Toggle */}
      <button
        onClick={onToggleHeatmap}
        className={`${btn} ${showHeatmap ? "!bg-emerald-600 !text-white" : ""}`}
        title={showHeatmap ? "Маркеры" : "Тепловая карта"}
        aria-label={showHeatmap ? "Переключить на маркеры" : "Переключить на тепловую карту"}
      >
        {showHeatmap ? "M" : "H"}
      </button>

      <div className="my-1" />

      {/* Geolocation */}
      <button onClick={onGeolocate} className={btn} title="Моё местоположение" aria-label="Определить моё местоположение">
        ◎
      </button>

      {/* Zoom */}
      <button onClick={onZoomIn} className={btn} aria-label="Приблизить карту">
        +
      </button>
      <button onClick={onZoomOut} className={btn} aria-label="Отдалить карту">
        −
      </button>
    </div>
  );
}
