import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createRouteHandlerClient } from "@/lib/supabase/server";
import type { ScoringThresholdInsert, ScoringThresholdUpdate } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper function to verify admin access
async function verifyAdminAccess() {
  const userSupabase = await createRouteHandlerClient();
  const { data: { user }, error: userError } = await userSupabase.auth.getUser();

  if (userError || !user) {
    return { error: "Authentication required", status: 401, user: null };
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: "Admin access required", status: 403, user: null };
  }

  return { error: null, status: 200, user, supabase };
}

// GET /api/admin/scoring-thresholds - Get all scoring thresholds
export async function GET(request: NextRequest) {
  try {
    const { error, status, supabase } = await verifyAdminAccess();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const url = new URL(request.url);
    const stationType = url.searchParams.get('station_type');
    const gender = url.searchParams.get('gender');
    const ageGroup = url.searchParams.get('age_group');

    let query = supabase
      .from('scoring_thresholds')
      .select('*')
      .order('station_type')
      .order('gender')
      .order('age_group');

    // Apply filters if provided
    if (stationType) {
      query = query.eq('station_type', stationType);
    }
    if (gender) {
      query = query.eq('gender', gender);
    }
    if (ageGroup) {
      query = query.eq('age_group', ageGroup);
    }

    const { data: thresholds, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching scoring thresholds:', fetchError);
      return NextResponse.json(
        { error: "Failed to fetch scoring thresholds" },
        { status: 500 }
      );
    }

    return NextResponse.json(thresholds);

  } catch (error) {
    console.error('Scoring thresholds API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/scoring-thresholds - Create new scoring threshold
export async function POST(request: NextRequest) {
  try {
    const { error, status, supabase } = await verifyAdminAccess();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body: ScoringThresholdInsert = await request.json();

    // Validate required fields
    const { station_type, metric_name, gender, age_group } = body;
    if (!station_type || !metric_name || !gender || !age_group) {
      return NextResponse.json(
        { error: "Missing required fields: station_type, metric_name, gender, age_group" },
        { status: 400 }
      );
    }

    // Check if threshold already exists
    const { data: existing } = await supabase
      .from('scoring_thresholds')
      .select('id')
      .eq('station_type', station_type)
      .eq('metric_name', metric_name)
      .eq('gender', gender)
      .eq('age_group', age_group)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Scoring threshold already exists for this combination" },
        { status: 409 }
      );
    }

    const { data: threshold, error: insertError } = await supabase
      .from('scoring_thresholds')
      .insert(body)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating scoring threshold:', insertError);
      return NextResponse.json(
        { error: "Failed to create scoring threshold" },
        { status: 500 }
      );
    }

    return NextResponse.json(threshold, { status: 201 });

  } catch (error) {
    console.error('Scoring thresholds POST error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scoring-thresholds - Update scoring threshold
export async function PUT(request: NextRequest) {
  try {
    const { error, status, supabase } = await verifyAdminAccess();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body: ScoringThresholdUpdate & { id: string } = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const { data: threshold, error: updateError } = await supabase
      .from('scoring_thresholds')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scoring threshold:', updateError);
      return NextResponse.json(
        { error: "Failed to update scoring threshold" },
        { status: 500 }
      );
    }

    return NextResponse.json(threshold);

  } catch (error) {
    console.error('Scoring thresholds PUT error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scoring-thresholds - Delete scoring threshold
export async function DELETE(request: NextRequest) {
  try {
    const { error, status, supabase } = await verifyAdminAccess();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    // Get the threshold first to return it in the response
    const { data: threshold, error: fetchError } = await supabase
      .from('scoring_thresholds')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !threshold) {
      return NextResponse.json(
        { error: "Scoring threshold not found" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('scoring_thresholds')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting scoring threshold:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete scoring threshold" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scoring threshold deleted successfully",
      deletedThreshold: threshold
    });

  } catch (error) {
    console.error('Scoring thresholds DELETE error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}