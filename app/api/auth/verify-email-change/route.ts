import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const supabase = createAdminClient();

function generateToken(userId: string, newEmail: string): string {
  const data = `${userId}:${newEmail}:${process.env.SUPABASE_JWT_SECRET}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get the pending email change request
    const { data: changeRequest, error: fetchError } = await supabase
      .from('email_change_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !changeRequest) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(changeRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Verify token matches
    const expectedToken = generateToken(changeRequest.user_id, changeRequest.new_email);
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Update user's email in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      changeRequest.user_id,
      { email: changeRequest.new_email }
    );

    if (updateError) {
      console.error('Error updating user email:', updateError);
      return NextResponse.json(
        { error: "Failed to update email" },
        { status: 500 }
      );
    }

    // Delete the email change request
    await supabase
      .from('email_change_requests')
      .delete()
      .eq('token', token);

    return NextResponse.json({
      message: "Email updated successfully"
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 