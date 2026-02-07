"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [71.4306, 51.1282], // Astana, Kazakhstan default
        zoom: 12,
        accessToken: mapboxToken,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right"
      );
    };

    initMap();

    return () => {
      map?.remove();
    };
  }, [mapboxToken]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/50 text-muted-foreground">
        <MapPin className="h-12 w-12" />
        <div className="text-center">
          <p className="font-medium">Карта недоступна</p>
          <p className="mt-1 text-sm">
            Добавьте <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            в <code className="rounded bg-muted px-1 py-0.5">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
}
