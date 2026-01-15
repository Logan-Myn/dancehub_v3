/**
 * @deprecated This file is deprecated. Supabase is being migrated to Better Auth + Neon.
 *
 * For authentication, use:
 * - import { authClient } from '@/lib/auth-client'
 * - import { useAuth } from '@/contexts/AuthContext'
 *
 * For database queries, use:
 * - import { sql, query, queryOne } from '@/lib/db'
 *
 * This file will be removed after Phase 5.2 and 5.3 are complete.
 */
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";

// Client-side Supabase instance (DEPRECATED)
export const createClient = () => {
  return createClientComponentClient<Database>();
}; 