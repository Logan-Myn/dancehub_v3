import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/components";
import { SignupVerificationEmail } from "@/lib/resend/templates/auth/signup-verification";
import { PasswordResetEmail } from "@/lib/resend/templates/auth/password-reset";
import { WelcomeEmail } from "@/lib/resend/templates/auth/welcome";

// Initialize Resend for sending emails
const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.EMAIL_FROM_ADDRESS || "DanceHub <account@dance-hub.io>";

// Helper function to send emails without blocking
async function sendEmail(
  to: string,
  subject: string,
  reactElement: React.ReactElement
) {
  try {
    const html = await render(reactElement);
    await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // Don't await - prevents timing attacks
      void sendEmail(
        user.email,
        "Reset your password",
        React.createElement(PasswordResetEmail, {
          name: user.name || "there",
          email: user.email,
          resetUrl: url,
        })
      );
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Don't await - prevents timing attacks
      void sendEmail(
        user.email,
        "Verify your email address",
        React.createElement(SignupVerificationEmail, {
          name: user.name || "there",
          email: user.email,
          verificationUrl: url,
        })
      );
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
      },
      fullName: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      isAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      stripeAccountId: {
        type: "string",
        required: false,
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        // Send verification to the new email address
        void sendEmail(
          newEmail,
          "Verify your new email address",
          React.createElement(SignupVerificationEmail, {
            name: user.name || "there",
            email: newEmail,
            verificationUrl: url,
          })
        );
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "email-password"],
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "dancehub",
  },

  callbacks: {
    onUserCreated: async ({ user }) => {
      // Send welcome email after user is created and verified
      console.log(`New user created: ${user.email}`);
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
