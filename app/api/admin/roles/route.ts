import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createRouteHandlerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

// Get user's current role
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to get user profile", details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Update a user's role (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { userId, newRole }: { userId: string, newRole: UserRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "Missing required fields: userId and newRole" },
        { status: 400 }
      );
    }

    // Validate role
    if (!['participant', 'operator', 'admin'].includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: participant, operator, admin" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const adminClient = createAdminClient();

    // Get current user and verify they're an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserError || currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Insufficient privileges. Admin role required." },
        { status: 403 }
      );
    }

    // Prevent admin from changing their own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Update the user's role using the database function
    const { error: updateError } = await adminClient
      .rpc('set_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user role", details: updateError.message },
        { status: 500 }
      );
    }

    // Get updated profile
    const { data: updatedProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, name, email, role, updated_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Role updated but failed to fetch updated profile", details: fetchError.message },
        { status: 500 }
      );
    }

    // Update custom claims directly
    try {
      // Update user's app_metadata with role claim
      const { error: claimsError } = await adminClient.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            role: updatedProfile.role,
            claims: {
              role: updatedProfile.role
            }
          }
        }
      );

      if (claimsError) {
        console.warn('Failed to update custom claims:', claimsError);
        // Don't fail the entire request for this
      }
    } catch (claimsError) {
      console.warn('Error updating custom claims:', claimsError);
      // Don't fail the entire request for this
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: `User role updated to ${newRole}`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}