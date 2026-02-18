import type { VenueListItem } from "./venue";

export interface SearchRequest {
  query: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  limit?: number;
}

export interface SearchResultItem {
  venue: VenueListItem;
  relevance: number;
  reason: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  interpretation: string;
  totalFound: number;
}
