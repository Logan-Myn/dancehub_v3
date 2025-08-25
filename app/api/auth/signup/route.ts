import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { email, password, full_name, redirectTo } = await request.json();

    console.log('Starting user creation with:', { email, full_name, redirectTo });

    // Use Supabase's native signup with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo || '/dashboard'}`,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('User created successfully. Verification email sent by Supabase.');

    return NextResponse.json({ 
      message: "Please check your email to confirm your account",
      user: data.user 
    });
  } catch (error) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 