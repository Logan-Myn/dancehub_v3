import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";

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

    if (!result || !result.status) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Note: Better Auth verifyEmail marks the user's email as verified
    // The user info is not returned, but the verification is complete

    return NextResponse.json({
      message: "Email verified successfully",
      verified: true,
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
