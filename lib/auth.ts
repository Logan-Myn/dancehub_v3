"use client";

import { authClient } from "./auth-client";

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || "Failed to sign in");
  }

  return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: window.location.origin + "/dashboard",
  });

  if (error) {
    throw new Error(error.message || "Failed to sign in with Google");
  }

  return data;
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  full_name: string
) {
  // Get the current URL path (excluding the /auth/signup part)
  const currentPath = window.location.pathname;
  const redirectPath = currentPath.startsWith("/auth/") ? "/" : currentPath;

  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name: full_name,
    callbackURL: redirectPath,
  });

  if (error) {
    throw new Error(error.message || "Failed to sign up");
  }

  return {
    message: "Please check your email to confirm your account",
    user: data?.user,
  };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await authClient.signOut();

  if (error) {
    throw new Error(error.message || "Failed to sign out");
  }
}

/**
 * Request password reset email
 */
export async function resetPassword(email: string) {
  const { error } = await authClient.forgetPassword({
    email,
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message || "Failed to send reset password email");
  }

  return { success: true };
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
) {
  const { error } = await authClient.resetPassword({
    token,
    newPassword,
  });

  if (error) {
    throw new Error(error.message || "Failed to reset password");
  }

  return { success: true };
}

/**
 * Change email address (requires authentication)
 */
export async function changeEmail(newEmail: string) {
  const { error } = await authClient.changeEmail({
    newEmail,
    callbackURL: "/dashboard/settings",
  });

  if (error) {
    throw new Error(error.message || "Failed to initiate email change");
  }

  return { success: true };
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  const { error } = await authClient.verifyEmail({
    token,
  });

  if (error) {
    throw new Error(error.message || "Failed to verify email");
  }

  return { success: true };
}
