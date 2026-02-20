import { logger } from "./logger";

// ============================================
// OpenStreetMap Overpass API Client
// ============================================
// Free, no API key required, no monthly limits.
// Replaces Apify 2GIS scraper for venue discovery.
//
// Used by:
//   - venue-scout CRON (City Radar) — bulk discovery
//   - lazy discovery — user search fallback
// ============================================

/** A venue discovered from OpenStreetMap */
export interface OsmVenue {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categorySlug: string;
  phone?: string;
  website?: string;
  osmId: string;
}

// OSM tag values → our internal category slug
const OSM_TAG_TO_CATEGORY: [string, string, string][] = [
  ["amenity", "restaurant", "restaurant"],
  ["amenity", "cafe", "cafe"],
  ["amenity", "fast_food", "cafe"],
  ["amenity", "bar", "bar"],
  ["amenity", "pub", "bar"],
  ["leisure", "park", "park"],
  ["shop", "mall", "mall"],
  ["amenity", "cinema", "entertainment"],
  ["amenity", "nightclub", "entertainment"],
  ["amenity", "theatre", "entertainment"],
  ["leisure", "bowling_alley", "entertainment"],
  ["tourism", "museum", "entertainment"],
  ["tourism", "gallery", "entertainment"],
  ["tourism", "attraction", "entertainment"],
  ["historic", "monument", "entertainment"],
];

// Russian search keywords → Overpass tag filters
const QUERY_TO_OSM: [RegExp, string[]][] = [
  [/ресторан/i, ['["amenity"="restaurant"]']],
  [/кафе|кофейн|кофе/i, ['["amenity"~"^(cafe|fast_food)$"]']],
  [/бар|паб|пив/i, ['["amenity"~"^(bar|pub)$"]']],
  [/парк|сквер|погул/i, ['["leisure"="park"]']],
  [/торгов|молл|трц|магаз/i, ['["shop"="mall"]']],
  [
    /развлеч|кинотеатр|боулинг|кино/i,
    ['["amenity"~"^(cinema|nightclub|theatre)$"]', '["leisure"="bowling_alley"]'],
  ],
  [/шашлык|мясо|гриль/i, ['["amenity"="restaurant"]', '["amenity"="fast_food"]']],
  [/wifi|работ/i, ['["amenity"~"^(cafe|restaurant)$"]']],
  [/ребёнк|ребенк|дет/i, ['["leisure"="park"]', '["amenity"="cafe"]']],
  [/музык|танц|вечер/i, ['["amenity"~"^(bar|pub|nightclub)$"]']],
  [/музей|галере|выставк|экспозиц/i, ['["tourism"~"^(museum|gallery)$"]']],
  [/достоприм|памятник|монумент|истори/i, ['["historic"~"^(monument|memorial|castle|ruins)$"]', '["tourism"="attraction"]']],
  [/театр|спектакл|пьес/i, ['["amenity"="theatre"]']],
];

const PRIMARY_ENDPOINT = "https://overpass-api.de/api/interpreter";
const FALLBACK_ENDPOINT = "https://overpass.kumi.systems/api/interpreter";

export class OverpassClient {
  /** Always configured — no API key needed */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Discover ALL venue types in a city at once.
   * Single Overpass query fetching restaurants, cafes, bars, parks, malls, entertainment.
   * Used by venue-scout CRON.
   */
  async discoverAll(
    cityLat: number,
    cityLng: number,
    radiusKm: number = 8,
    cityName?: string,
  ): Promise<OsmVenue[]> {
    const bbox = toBbox(cityLat, cityLng, radiusKm);

    const query = `
[out:json][timeout:60];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|cinema|nightclub|theatre)$"]["name"](${bbox});
  nwr["leisure"~"^(park|bowling_alley)$"]["name"](${bbox});
  nwr["shop"="mall"]["name"](${bbox});
  nwr["tourism"~"^(museum|gallery|attraction)$"]["name"](${bbox});
  nwr["historic"~"^(monument|memorial)$"]["name"](${bbox});
);
out center qt;
`;

    return this.execute(query, cityName);
  }

  /**
   * Search for venues matching a Russian text query in a city.
   * Maps keywords to OSM tags. Used by lazy discovery.
   */
  async search(
    searchQuery: string,
    cityLat: number,
    cityLng: number,
    radiusKm: number = 8,
    maxItems: number = 20,
    cityName?: string,
  ): Promise<OsmVenue[]> {
    const bbox = toBbox(cityLat, cityLng, radiusKm);
    const filters = queryToOsmFilters(searchQuery);

    const query = `
[out:json][timeout:30];
(
  ${filters.map((f) => `nwr${f}["name"](${bbox});`).join("\n  ")}
);
out center qt;
`;

    const results = await this.execute(query, cityName);
    return results.slice(0, maxItems);
  }

  private async execute(query: string, cityName?: string): Promise<OsmVenue[]> {
    // Try primary endpoint first
    const result = await this.fetchOverpass(PRIMARY_ENDPOINT, query, cityName);
    if (result !== null) return result;

    // Fallback to community mirror
    logger.info("Overpass: trying fallback endpoint", {
      endpoint: "OverpassClient",
    });
    const fallback = await this.fetchOverpass(FALLBACK_ENDPOINT, query, cityName);
    return fallback ?? [];
  }

  private async fetchOverpass(
    endpoint: string,
    query: string,
    cityName?: string,
  ): Promise<OsmVenue[] | null> {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(65_000),
      });

      if (!res.ok) {
        logger.warn(`Overpass ${res.status} from ${endpoint}`, {
          endpoint: "OverpassClient",
        });
        return null;
      }

      const data = await res.json();
      const elements = data.elements || [];
      return parseElements(elements, cityName);
    } catch (error) {
      logger.warn(`Overpass error from ${endpoint}`, {
        endpoint: "OverpassClient",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// ============================================
// Helpers
// ============================================

function parseElements(elements: Record<string, unknown>[], cityName?: string): OsmVenue[] {
  return elements
    .filter((el) => {
      const tags = el.tags as Record<string, string> | undefined;
      return tags?.name;
    })
    .map((el) => {
      const tags = (el.tags || {}) as Record<string, string>;
      const center = el.center as
        | { lat?: number; lon?: number }
        | undefined;

      const latitude = Number(el.lat) || center?.lat;
      const longitude = Number(el.lon) || center?.lon;

      return {
        name: tags.name,
        address: buildAddress(tags, cityName),
        latitude: latitude ?? NaN,
        longitude: longitude ?? NaN,
        categorySlug: resolveCategory(tags),
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        osmId: `${el.type}/${el.id}`,
      };
    })
    .filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
}

function resolveCategory(tags: Record<string, string>): string {
  for (const [tagKey, tagValue, slug] of OSM_TAG_TO_CATEGORY) {
    if (tags[tagKey] === tagValue) return slug;
  }
  return "cafe";
}

function buildAddress(tags: Record<string, string>, cityName?: string): string {
  const parts: string[] = [];

  // Try structured address first
  if (tags["addr:street"]) {
    parts.push(tags["addr:street"]);
    if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  }

  // City from OSM tags or from the city we're searching
  const city = tags["addr:city"] || tags["addr:district"] || cityName || "";

  if (parts.length > 0) {
    return city ? `${city}, ${parts.join(" ")}` : parts.join(" ");
  }

  // Fallback: free-form address tag
  if (tags.address) return tags.address;
  if (tags["addr:full"]) return tags["addr:full"];

  // Fallback: use locality/place name
  if (tags["addr:place"]) {
    return city ? `${city}, ${tags["addr:place"]}` : tags["addr:place"];
  }

  // Last resort: city name from query context
  if (city) return city;

  return "";
}

function queryToOsmFilters(q: string): string[] {
  for (const [regex, filters] of QUERY_TO_OSM) {
    if (regex.test(q)) return filters;
  }
  // Default: all food venues
  return ['["amenity"~"^(restaurant|cafe|bar|pub)$"]'];
}

/** Convert center + radius (km) to Overpass bbox string: south,west,north,east */
function toBbox(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const south = (lat - latDelta).toFixed(4);
  const north = (lat + latDelta).toFixed(4);
  const west = (lng - lngDelta).toFixed(4);
  const east = (lng + lngDelta).toFixed(4);

  return `${south},${west},${north},${east}`;
}
