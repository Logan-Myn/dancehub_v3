import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Server-side Supabase instance for pages directory
export const createPagesServerClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 