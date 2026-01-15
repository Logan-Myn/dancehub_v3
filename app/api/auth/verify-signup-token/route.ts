import { auth } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/components";
import { WelcomeEmail } from "@/lib/resend/templates/auth/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.EMAIL_FROM_ADDRESS || "DanceHub <account@dance-hub.io>";

/**
 * Verify email token via Better Auth
 * This endpoint handles the token verification and sends a welcome email
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

    // Get user info to send welcome email
    // The result might contain user info depending on Better Auth config
    const user = result.user;

    if (user) {
      // Send welcome email (don't await)
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;
      const html = await render(
        React.createElement(WelcomeEmail, {
          name: user.name || "there",
          dashboardUrl: dashboardUrl,
        })
      );

      void resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Welcome to DanceHub - Let's get started!",
        html,
      }).then(() => {
        console.log(`Welcome email sent to: ${user.email}`);
      }).catch((err) => {
        console.error("Error sending welcome email:", err);
      });
    }

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
