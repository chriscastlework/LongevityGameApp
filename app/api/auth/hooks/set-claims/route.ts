import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createRouteHandlerClient } from "@/lib/supabase/server";

// Direct endpoint to refresh custom claims
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's role from profiles table
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for user:', user.id, profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Update user's app_metadata with role claim
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          role: profile.role,
          claims: {
            role: profile.role
          }
        }
      }
    );

    if (updateError) {
      console.error('Failed to update user claims:', updateError);
      return NextResponse.json(
        { error: "Failed to update user claims", details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`Updated claims for user ${user.id} with role: ${profile.role}`);

    return NextResponse.json({
      success: true,
      user_id: user.id,
      role: profile.role,
      message: "Custom claims updated successfully"
    });

  } catch (error: any) {
    console.error('Claims update error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Manual endpoint to refresh claims for current user
export async function PUT(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // Get user from request body
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Get user's role from profiles table
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Update user's app_metadata with role claim
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: {
          role: profile.role,
          claims: {
            role: profile.role
          }
        }
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user claims", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id,
      role: profile.role,
      message: "Custom claims refreshed successfully"
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}