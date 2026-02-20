"use client";

import { useCallback, useRef, useState } from "react";
import Map, { type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { VenueMarker } from "./VenueMarker";
import { HeatmapLayer } from "./HeatmapLayer";
import { MapControls } from "./MapControls";
import type { VenueListItem } from "@/types/venue";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface MapViewProps {
  venues: VenueListItem[];
  onVenueClick: (venueId: string) => void;
  selectedVenueId: string | null;
  highlightedVenueIds: Set<string>;
  center: { lat: number; lng: number };
  zoom: number;
}

export function MapView({ venues, onVenueClick, selectedVenueId, highlightedVenueIds, center, zoom }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom,
  });

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  const handleGeolocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      () => {},
    );
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {showHeatmap ? (
          <HeatmapLayer venues={venues} />
        ) : (
          venues.map((v) => (
            <VenueMarker
              key={v.id}
              venue={v}
              isSelected={v.id === selectedVenueId}
              isHighlighted={highlightedVenueIds.has(v.id)}
              onClick={() => onVenueClick(v.id)}
            />
          ))
        )}
      </Map>

      <MapControls
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        onGeolocate={handleGeolocate}
        onZoomIn={() => mapRef.current?.zoomIn({ duration: 300 })}
        onZoomOut={() => mapRef.current?.zoomOut({ duration: 300 })}
      />
    </div>
  );
}
