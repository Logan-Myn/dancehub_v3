import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * Verify email via Better Auth
 * This endpoint handles both initial email verification and email change verification
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // Use Better Auth's server-side API to verify email
    const result = await auth.api.verifyEmail({
      query: {
        token,
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // If we have user info, sync the email to profiles table
    if (result.user) {
      try {
        await sql`
          UPDATE profiles
          SET email = ${result.user.email}, updated_at = NOW()
          WHERE auth_user_id = ${result.user.id}
        `;
      } catch (profileError) {
        console.error("Error syncing profile email:", profileError);
        // Don't fail - auth email was verified successfully
      }
    }

    return NextResponse.json({
      message: "Email verified successfully",
      user: result.user,
    });

  } catch (error) {
    console.error("Error in verify-email:", error);

    if (error instanceof Error) {
      if (error.message.includes("expired") || error.message.includes("invalid")) {
        return NextResponse.json(
          { error: "Token has expired or is invalid" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
