export interface VenueCategory {
  slug: string;
  name: string;
  icon: string;
  color: string;
}

export interface VenueTag {
  slug: string;
  name: string;
}

export interface VenueListItem {
  id: string;
  name: string;
  slug: string;
  category: VenueCategory;
  address: string;
  latitude: number;
  longitude: number;
  liveScore: number;
  photoUrls: string[];
  tags: string[];
  isActive: boolean;
}

export interface VenueDetail extends VenueListItem {
  description: string | null;
  aiDescription: string | null;
  phone: string | null;
  whatsapp: string | null;
  workingHours: Record<string, string> | null;
  tags: string[];
  tagDetails: VenueTag[];
  reviewCount: number;
  signalCount: number;
  recentReviews: VenueReview[];
}

export interface VenueReview {
  text: string;
  sentiment: number;
  source: string;
  createdAt: string;
}

export interface VenueFilters {
  bounds?: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  };
  category?: string;
  tag?: string;
  minScore?: number;
  limit?: number;
  offset?: number;
}
