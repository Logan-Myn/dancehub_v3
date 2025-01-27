import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { email, password, full_name, redirectTo } = await request.json();

    console.log('Starting user creation with:', { email, full_name, redirectTo });

    // Create user with email confirmation disabled
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name,
        email, // Add email to metadata to ensure it's available for the trigger
      }
    });

    if (createError) {
      console.error('Error creating user:', {
        error: createError,
        message: createError.message,
        code: createError.status
      });
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    console.log('User created successfully:', { userId: user?.user?.id });

    // Send verification email
    if (user?.user) {
      console.log('Sending verification email for user:', user.user.id);
      
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          userId: user.user.id,
          redirectTo: redirectTo || '/',
        }),
      });

      if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.json();
        console.error('Error sending verification email:', {
          status: verifyResponse.status,
          error: verifyError,
          userId: user.user.id
        });
      } else {
        console.log('Verification email sent successfully');
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in signup:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 