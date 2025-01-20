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

    // Check if email is already in use
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers();
    const isEmailTaken = existingUser?.users.some(
      user => user.email === emailRequest.new_email && user.id !== emailRequest.user_id
    );

    if (isEmailTaken) {
      return NextResponse.json(
        { error: "This email address is already registered with another account" },
        { status: 400 }
      );
    }

    // Update the user's email in Supabase Auth
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      emailRequest.user_id,
      {
        email: emailRequest.new_email,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Error updating email:', {
        error: updateError,
        userId: emailRequest.user_id,
        newEmail: emailRequest.new_email,
        message: updateError.message,
        status: updateError.status
      });
      return NextResponse.json(
        { error: `Failed to update email: ${updateError.message}` },
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