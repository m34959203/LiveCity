export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "business";
export type SubscriptionTier = "free" | "premium";
export type BusinessTier = "free" | "pro";
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type VenueClaimStatus = "unclaimed" | "claimed" | "verified";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: string;
          has_children: boolean;
          has_pets: boolean;
          has_car: boolean;
          preferred_locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          has_children?: boolean;
          has_pets?: boolean;
          has_car?: boolean;
          preferred_locale?: string;
        };
        Update: {
          role?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          has_children?: boolean;
          has_pets?: boolean;
          has_car?: boolean;
          preferred_locale?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          phone: string | null;
          whatsapp: string | null;
          website: string | null;
          latitude: number;
          longitude: number;
          address: string | null;
          city: string;
          live_score: number;
          live_score_updated_at: string;
          review_count: number;
          ai_summary: string | null;
          tags: string[];
          claim_status: string;
          business_tier: string;
          cover_image_url: string | null;
          images: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          latitude: number;
          longitude: number;
          address?: string | null;
          city: string;
          live_score?: number;
          ai_summary?: string | null;
          tags?: string[];
          claim_status?: string;
          business_tier?: string;
          cover_image_url?: string | null;
          images?: string[];
        };
        Update: {
          owner_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          latitude?: number;
          longitude?: number;
          address?: string | null;
          city?: string;
          live_score?: number;
          ai_summary?: string | null;
          tags?: string[];
          claim_status?: string;
          business_tier?: string;
          cover_image_url?: string | null;
          images?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews_analyzed: {
        Row: {
          id: string;
          venue_id: string;
          source: string;
          source_url: string | null;
          source_author: string | null;
          original_text: string;
          sentiment: number;
          tags: string[];
          ai_summary: string | null;
          freshness_weight: number;
          published_at: string;
          analyzed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          source: string;
          source_url?: string | null;
          source_author?: string | null;
          original_text: string;
          sentiment: number;
          tags?: string[];
          ai_summary?: string | null;
          freshness_weight?: number;
          published_at?: string;
          analyzed_at?: string;
        };
        Update: {
          venue_id?: string;
          source?: string;
          source_url?: string | null;
          source_author?: string | null;
          original_text?: string;
          sentiment?: number;
          tags?: string[];
          ai_summary?: string | null;
          freshness_weight?: number;
          published_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_analyzed_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          venue_id: string;
          user_id: string;
          status: string;
          requested_date: string;
          requested_time: string | null;
          party_size: number;
          message: string | null;
          business_response: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          user_id: string;
          status?: string;
          requested_date: string;
          requested_time?: string | null;
          party_size?: number;
          message?: string | null;
        };
        Update: {
          status?: string;
          business_response?: string | null;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_venues: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          filter_city?: string | null;
        };
        Returns: {
          id: string;
          name: string;
          category: string;
          latitude: number;
          longitude: number;
          live_score: number;
          ai_summary: string | null;
          similarity: number;
        }[];
      };
      recalculate_live_score: {
        Args: {
          target_venue_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      user_role: "user" | "business";
      subscription_tier: "free" | "premium";
      business_tier: "free" | "pro";
      booking_status: "pending" | "accepted" | "rejected" | "cancelled";
      venue_claim_status: "unclaimed" | "claimed" | "verified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
