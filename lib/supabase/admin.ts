/**
 * @deprecated This file is deprecated. Supabase is being migrated to Better Auth + Neon.
 *
 * For authentication (server-side), use:
 * - import { auth } from '@/lib/auth-server'
 * - import { getSession, requireAuth, requireAdmin } from '@/lib/auth-session'
 *
 * For database queries, use:
 * - import { sql, query, queryOne, queryFirst } from '@/lib/db'
 * - import { createDbClient, adminQuery } from '@/lib/db/admin'
 *
 * This file will be removed after Phase 5.2 and 5.3 are complete.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // ms

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Admin client for server-side operations (DEPRECATED)
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase credentials are required. Please check your environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}; 