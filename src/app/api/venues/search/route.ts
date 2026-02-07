import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export async function POST(request: Request) {
  const { query, city } = await request.json();

  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  try {
    // Generate embedding for the search query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: query,
    });

    const supabase = await createClient();

    // Use the match_venues function for vector similarity search
    const { data, error } = await supabase.rpc("match_venues", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 15,
      filter_city: city ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venues: data });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
