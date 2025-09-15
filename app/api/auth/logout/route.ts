import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Bearer token required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create client
    const supabase = await createRouteHandlerClient();

    console.log("Attempting logout...");

    // Sign out user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json(
        { error: "Logout failed", details: error.message },
        { status: 400 }
      );
    }

    console.log("Logout successful");

    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error: any) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}