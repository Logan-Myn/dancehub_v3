import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // ms

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Admin client for server-side operations (API routes)
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are required. Please check your environment variables.');
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false
      }
    }
  );
} 