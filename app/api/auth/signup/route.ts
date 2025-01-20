import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { email, password, full_name, redirectTo } = await request.json();

    // Create user with email confirmation disabled
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    // Send verification email
    if (user?.user) {
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
        console.error('Error sending verification email:', await verifyResponse.json());
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 