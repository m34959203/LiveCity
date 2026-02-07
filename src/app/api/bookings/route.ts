import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is a business owner — fetch their venues' bookings
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "business") {
    // Get bookings for all venues owned by this user
    const { data: venues } = await supabase
      .from("venues")
      .select("id")
      .eq("owner_id", user.id);

    const venueIds = venues?.map((v) => v.id) ?? [];

    if (venueIds.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, venues(name, slug)")
      .in("venue_id", venueIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings });
  }

  // Regular user — fetch their own bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*, venues(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { venue_id, requested_date, requested_time, party_size, message } = body;

  if (!venue_id || !requested_date) {
    return NextResponse.json(
      { error: "venue_id and requested_date are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      venue_id,
      user_id: user.id,
      requested_date,
      requested_time: requested_time ?? null,
      party_size: party_size ?? 1,
      message: message ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
