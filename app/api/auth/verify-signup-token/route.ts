import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";

/**
 * Verify email token via Better Auth
 * This endpoint handles the token verification for signup
 * Note: Welcome emails should be handled via Better Auth's onUserVerified callback
 * or a separate workflow after the user is verified
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

    // Email verified successfully
    // Better Auth's autoSignInAfterVerification will handle signing in the user

    return NextResponse.json({
      message: "Email verified successfully",
      redirectTo: "/dashboard",
    });

  } catch (error) {
    console.error("Error in verify-signup-token:", error);

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
