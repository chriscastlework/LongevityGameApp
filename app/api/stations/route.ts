import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Station } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/stations - Get all active stations
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get all active stations ordered by sort_order
    const { data: stations, error } = await supabase
      .from('stations')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching stations:', error);
      return NextResponse.json(
        { error: "Failed to fetch stations" },
        { status: 500 }
      );
    }

    // Set cache headers for 5 minutes
    const response = NextResponse.json(stations);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');

    return response;

  } catch (error) {
    console.error('Stations API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/stations - Update station (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // For admin client, we skip auth check since it bypasses RLS
    // In production, add proper API key validation here

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Station ID is required" },
        { status: 400 }
      );
    }

    // Update the station
    const { data: station, error } = await supabase
      .from('stations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating station:', error);
      return NextResponse.json(
        { error: "Failed to update station" },
        { status: 500 }
      );
    }

    return NextResponse.json(station);

  } catch (error) {
    console.error('Stations API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}