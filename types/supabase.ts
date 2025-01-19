export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      communities: {
        Row: {
          id: string
          created_at: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          created_by: string
          stripe_account_id: string | null
          membership_enabled: boolean
          membership_price: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          created_by: string
          stripe_account_id?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          stripe_account_id?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
        }
      }
      members: {
        Row: {
          id: string
          user_id: string
          community_id: string
          created_at: string
          role: string
          subscription_id: string | null
          subscription_status: string | null
        }
        Insert: {
          id?: string
          user_id: string
          community_id: string
          created_at?: string
          role?: string
          subscription_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          community_id?: string
          created_at?: string
          role?: string
          subscription_id?: string | null
          subscription_status?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          email: string | null
        }
        Insert: {
          id: string
          created_at?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
        }
      }
      threads: {
        Row: {
          id: string
          created_at: string
          title: string
          content: string
          community_id: string
          user_id: string
          category_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          content: string
          community_id: string
          user_id: string
          category_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          content?: string
          community_id?: string
          user_id?: string
          category_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
