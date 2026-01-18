"use client";

import { createAuthClient } from "better-auth/react";

// Get the base URL for auth client (supports Vercel preview deployments)
function getBaseURL(): string {
  // In browser, use current origin for preview deployments
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: use env vars
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { useSession, signIn, signUp, signOut } = authClient;
