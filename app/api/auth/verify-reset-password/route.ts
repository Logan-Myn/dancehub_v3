import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const supabase = createAdminClient();

// Generate a secure token for verification
function generateToken(userId: string, email: string): string {
  const data = `${userId}:${email}:${process.env.SUPABASE_JWT_SECRET}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    // Get the password reset request
    const { data: resetRequest, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !resetRequest) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(resetRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Reset link has expired" },
        { status: 400 }
      );
    }

    // Update the user's password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetRequest.user_id,
      { password }
    );

    if (updateError) {
      console.error('Error updating password:', {
        error: updateError,
        userId: resetRequest.user_id,
        message: updateError.message,
        status: updateError.status
      });
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Delete the reset request
    await supabase
      .from('password_reset_requests')
      .delete()
      .eq('token', token);

    return NextResponse.json({
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 