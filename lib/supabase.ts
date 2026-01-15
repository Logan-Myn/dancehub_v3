/**
 * @deprecated This file is deprecated. Supabase is being migrated to Better Auth + Neon.
 *
 * For authentication, use:
 * - Client-side: import { authClient } from '@/lib/auth-client'
 * - Server-side: import { auth } from '@/lib/auth-server'
 * - Session helpers: import { getSession, getUser } from '@/lib/auth-session'
 *
 * For database queries, use:
 * - import { sql, query, queryOne } from '@/lib/db'
 *
 * This file will be removed after Phase 5.2 and 5.3 are complete.
 */

// Client-side exports (DEPRECATED)
export { createClient } from "./supabase/client";

// Server-side only exports (DEPRECATED)
export { createAdminClient } from "./supabase/admin"; 