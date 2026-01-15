import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * Custom signup endpoint that creates a user via Better Auth
 * and also creates a profile in our profiles table
 */
export async function POST(request: Request) {
  try {
    const { email, password, full_name, redirectTo } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Use Better Auth's server-side signup API
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: full_name || "",
        callbackURL: redirectTo || "/dashboard",
      },
    });

    if (!result.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create a profile for the user in our profiles table
    try {
      await sql`
        INSERT INTO profiles (id, email, full_name, display_name, created_at, updated_at, auth_user_id)
        VALUES (
          gen_random_uuid(),
          ${email},
          ${full_name || null},
          ${full_name?.split(" ")[0] || null},
          NOW(),
          NOW(),
          ${result.user.id}
        )
        ON CONFLICT (email) DO UPDATE SET
          auth_user_id = ${result.user.id},
          updated_at = NOW()
      `;
    } catch (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't fail the signup if profile creation fails
      // The profile can be created later on first login
    }

    return NextResponse.json({
      message: "Please check your email to confirm your account",
      user: result.user,
    });
  } catch (error) {
    console.error("Error in signup:", error);

    // Handle specific Better Auth errors
    if (error instanceof Error) {
      if (error.message.includes("already exists") || error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
