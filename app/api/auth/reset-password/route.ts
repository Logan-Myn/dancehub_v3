import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";

/**
 * Request password reset email via Better Auth
 * Better Auth handles finding the user and sending the reset email
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Use Better Auth's server-side API to request password reset
    // This will trigger the sendResetPassword callback in auth-server.ts
    await auth.api.forgetPassword({
      body: {
        email,
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
      },
    });

    // Always return success for security (don't reveal if email exists)
    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link"
    });

  } catch (error) {
    console.error("Error in reset-password:", error);

    // Always return success for security (don't reveal if email exists)
    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link"
    });
  }
}
