// ============================================
// Shared city configuration
// Used by: CitySelector (client), search API, venue-scout
// ============================================

export interface CityConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const CITIES: CityConfig[] = [
  { id: "almaty", name: "Алматы", lat: 43.2220, lng: 76.8512, zoom: 13 },
  { id: "astana", name: "Астана", lat: 51.1694, lng: 71.4491, zoom: 13 },
  { id: "shymkent", name: "Шымкент", lat: 42.3417, lng: 69.5967, zoom: 13 },
  { id: "karaganda", name: "Караганда", lat: 49.8047, lng: 73.1094, zoom: 13 },
  { id: "jezkazgan", name: "Жезказган", lat: 47.7833, lng: 67.7144, zoom: 13 },
];

export const DEFAULT_CITY_ID = "almaty";

export function getCityById(id: string): CityConfig | undefined {
  return CITIES.find((c) => c.id === id);
}
