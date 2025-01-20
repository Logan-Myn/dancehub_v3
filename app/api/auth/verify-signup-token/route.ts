import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const supabase = createAdminClient();

// Generate a secure token for verification
function generateToken(userId: string, email: string): string {
  const data = `${userId}:${email}:${process.env.SUPABASE_JWT_SECRET}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // Get the signup verification request
    const { data: verificationRequest, error: fetchError } = await supabase
      .from('signup_verifications')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !verificationRequest) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(verificationRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Verify token matches
    const expectedToken = generateToken(verificationRequest.user_id, verificationRequest.email);
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Update the user's email confirmation in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      verificationRequest.user_id,
      {
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Error confirming email:', {
        error: updateError,
        userId: verificationRequest.user_id,
        message: updateError.message,
        status: updateError.status
      });
      return NextResponse.json(
        { error: `Failed to confirm email: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Delete the verification request
    await supabase
      .from('signup_verifications')
      .delete()
      .eq('token', token);

    // Return the redirect path along with the success message
    return NextResponse.json({
      message: "Email verified successfully",
      redirectTo: verificationRequest.redirect_to
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 