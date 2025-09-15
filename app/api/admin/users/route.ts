import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createRouteHandlerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

// Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
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

    // Check if current user is admin or operator
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserError || !['admin', 'operator'].includes(currentUserProfile?.role)) {
      return NextResponse.json(
        { error: "Insufficient privileges. Admin or operator role required." },
        { status: 403 }
      );
    }

    // Get URL parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = adminClient
      .from('profiles')
      .select(`
        id,
        name,
        email,
        role,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply filters
    if (role && ['participant', 'operator', 'admin'].includes(role as string)) {
      query = query.eq('role', role as UserRole);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    const { data: profiles, error: profilesError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      return NextResponse.json(
        { error: "Failed to fetch users", details: profilesError.message },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: {
        users: profiles,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}