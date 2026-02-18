"use client";

import { Source, Layer } from "react-map-gl/mapbox";
import type { VenueListItem } from "@/types/venue";

interface HeatmapLayerProps {
  venues: VenueListItem[];
}

export function HeatmapLayer({ venues }: HeatmapLayerProps) {
  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: venues.map((v) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [v.longitude, v.latitude],
      },
      properties: {
        weight: v.liveScore / 10,
      },
    })),
  };

  return (
    <Source id="heatmap-source" type="geojson" data={geojson}>
      <Layer
        id="heatmap-layer"
        type="heatmap"
        paint={{
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 1.5,
          "heatmap-radius": 40,
          "heatmap-opacity": 0.8,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "rgb(59,130,246)",
            0.4,
            "rgb(16,185,129)",
            0.6,
            "rgb(250,204,21)",
            0.8,
            "rgb(249,115,22)",
            1,
            "rgb(239,68,68)",
          ],
        }}
      />
    </Source>
  );
}
