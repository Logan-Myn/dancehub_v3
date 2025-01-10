import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Admin client for server-side operations (API routes)
export const createAdminClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
} 