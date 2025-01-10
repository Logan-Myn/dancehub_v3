import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// Client-side Supabase instance
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Server-side Supabase instance
export const createServerClient = () => {
  return createServerComponentClient<Database>({
    cookies,
  })
}

// Admin client for server-side operations
export const supabaseAdmin = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) 