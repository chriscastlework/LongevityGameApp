import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    // Check if user's email is already confirmed
    if (user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: "Email already confirmed",
          message: "Your email is already confirmed"
        },
        { status: 400 }
      );
    }

    // Resend confirmation email
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/participate?confirmed=true`
      }
    });

    if (resendError) {
      console.error("Error resending confirmation email:", resendError);
      return NextResponse.json(
        {
          error: "Failed to resend confirmation email",
          details: resendError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent successfully"
    });

  } catch (error: any) {
    console.error("Resend confirmation API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}