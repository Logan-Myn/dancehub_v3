import { headers } from "next/headers";
import { auth } from "./auth-server";

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

/**
 * Get the current session in server components and API routes
 * @returns The session object or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Get the current user in server components and API routes
 * @returns The user object or null if not authenticated
 */
export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require authentication - throws redirect if not authenticated
 * Use in server components that require authentication
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require admin role - throws error if not admin
 * Use in server components that require admin access
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (!session.user.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  return session;
}
