import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // Get the email change request
    const { data: emailRequest, error: fetchError } = await supabase
      .from('email_change_requests')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !emailRequest) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(emailRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Update the user's email in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      emailRequest.user_id,
      { email: emailRequest.new_email, email_confirm: true }
    );

    if (updateError) {
      console.error('Error updating email:', updateError);
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