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
          price: number | null
          currency: string | null
          membership_enabled: boolean
          membership_price: number | null
          stripe_account_id: string | null
          thread_categories: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          created_by: string
          price?: number | null
          currency?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
          stripe_account_id?: string | null
          thread_categories?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          price?: number | null
          currency?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
          stripe_account_id?: string | null
          thread_categories?: Json | null
        }
      }
      members: {
        Row: {
          id: string
          created_at: string
          user_id: string
          community_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          community_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          community_id?: string
        }
      }
      threads: {
        Row: {
          id: string
          created_at: string
          title: string
          content: string
          user_id: string
          community_id: string
          category_id: string | null
          likes: string[] | null
          comments: Json[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          content: string
          user_id: string
          community_id: string
          category_id?: string | null
          likes?: string[] | null
          comments?: Json[] | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          content?: string
          user_id?: string
          community_id?: string
          category_id?: string | null
          likes?: string[] | null
          comments?: Json[] | null
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