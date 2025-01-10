import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Client-side Supabase instance
export const createClient = () => {
  return createClientComponentClient<Database>()
} 