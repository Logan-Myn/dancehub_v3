import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Request email change via Better Auth
 * Requires authentication - user must be logged in
 */
export async function POST(request: Request) {
  try {
    const { newEmail } = await request.json();

    if (!newEmail) {
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Use Better Auth's server-side API to change email
    // This requires the user to be authenticated
    const result = await auth.api.changeEmail({
      body: {
        newEmail,
        callbackURL: "/dashboard/settings",
      },
      headers: await headers(),
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to initiate email change" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent to your new email address"
    });

  } catch (error) {
    console.error("Error in change-email:", error);

    if (error instanceof Error) {
      if (error.message.includes("already") || error.message.includes("exists")) {
        return NextResponse.json(
          { error: "This email address is already registered with another account" },
          { status: 400 }
        );
      }
      if (error.message.includes("Unauthorized") || error.message.includes("authenticated")) {
        return NextResponse.json(
          { error: "You must be logged in to change your email" },
          { status: 401 }
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
