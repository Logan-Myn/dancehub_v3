import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * Verify email change token via Better Auth
 * This endpoint is called when user clicks the verification link in their email
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Use Better Auth's server-side API to verify the email change
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

    // If Better Auth returns user info, update the profiles table
    if (result.user) {
      try {
        await sql`
          UPDATE profiles
          SET email = ${result.user.email}, updated_at = NOW()
          WHERE auth_user_id = ${result.user.id}
        `;
      } catch (profileError) {
        console.error("Error updating profile email:", profileError);
        // Don't fail - the auth email was updated successfully
      }
    }

    return NextResponse.json({
      message: "Email updated successfully"
    });

  } catch (error) {
    console.error("Error in verify-email-change:", error);

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
