import { NextResponse } from "next/server";

/**
 * OAuth Callback Route
 *
 * Better Auth handles OAuth callbacks via its catch-all route at /api/auth/[...all]
 * This route now serves as a fallback/redirect for any direct hits
 *
 * The actual OAuth flow is:
 * 1. User clicks "Sign in with Google"
 * 2. Better Auth redirects to Google OAuth
 * 3. Google redirects back to /api/auth/callback/google (handled by Better Auth)
 * 4. Better Auth creates session and redirects to callbackURL
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const error = requestUrl.searchParams.get("error");

  // Handle error from OAuth provider
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?message=${encodeURIComponent(error)}`,
        requestUrl.origin
      )
    );
  }

  // Handle email verification token (redirected from email link)
  if (token) {
    // Redirect to the verify-email page with the token
    return NextResponse.redirect(
      new URL(`/auth/verify-email?token=${token}`, requestUrl.origin)
    );
  }

  // Default redirect to dashboard (OAuth flow completed by Better Auth)
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
