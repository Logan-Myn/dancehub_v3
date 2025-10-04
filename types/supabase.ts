export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      communities: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          created_by: string
          stripe_account_id: string | null
          stripe_product_id: string | null
          stripe_price_id: string | null
          stripe_onboarding_type: string | null
          membership_enabled: boolean
          membership_price: number | null
          active_member_count: number | null
          total_member_count: number | null
          members_count: number | null
          promotional_period_start: string | null
          promotional_period_end: string | null
          promotional_fee_percentage: number | null
          status: string | null
          opening_date: string | null
          can_change_opening_date: boolean | null
          about_page: Json | null
          custom_links: Json | null
          thread_categories: Json | null
          price: number | null
          currency: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          created_by: string
          stripe_account_id?: string | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          stripe_onboarding_type?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
          active_member_count?: number | null
          total_member_count?: number | null
          members_count?: number | null
          promotional_period_start?: string | null
          promotional_period_end?: string | null
          promotional_fee_percentage?: number | null
          status?: string | null
          opening_date?: string | null
          can_change_opening_date?: boolean | null
          about_page?: Json | null
          custom_links?: Json | null
          thread_categories?: Json | null
          price?: number | null
          currency?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          created_by?: string
          stripe_account_id?: string | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          stripe_onboarding_type?: string | null
          membership_enabled?: boolean
          membership_price?: number | null
          active_member_count?: number | null
          total_member_count?: number | null
          members_count?: number | null
          promotional_period_start?: string | null
          promotional_period_end?: string | null
          promotional_fee_percentage?: number | null
          status?: string | null
          opening_date?: string | null
          can_change_opening_date?: boolean | null
          about_page?: Json | null
          custom_links?: Json | null
          thread_categories?: Json | null
          price?: number | null
          currency?: string | null
        }
      }
      community_members: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          community_id: string | null
          role: string | null
          joined_at: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          payment_intent_id: string | null
          current_period_end: string | null
          platform_fee_percentage: number | null
          last_payment_date: string | null
          is_promotional_member: boolean | null
          promotional_period_end: string | null
          pre_registration_payment_method_id: string | null
          stripe_invoice_id: string | null
          pre_registration_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          community_id?: string | null
          role?: string | null
          joined_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          payment_intent_id?: string | null
          current_period_end?: string | null
          platform_fee_percentage?: number | null
          last_payment_date?: string | null
          is_promotional_member?: boolean | null
          promotional_period_end?: string | null
          pre_registration_payment_method_id?: string | null
          stripe_invoice_id?: string | null
          pre_registration_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          community_id?: string | null
          role?: string | null
          joined_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          payment_intent_id?: string | null
          current_period_end?: string | null
          platform_fee_percentage?: number | null
          last_payment_date?: string | null
          is_promotional_member?: boolean | null
          promotional_period_end?: string | null
          pre_registration_payment_method_id?: string | null
          stripe_invoice_id?: string | null
          pre_registration_date?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
          full_name: string | null
          avatar_url: string | null
          email: string
          is_admin: boolean | null
          stripe_account_id: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email: string
          is_admin?: boolean | null
          stripe_account_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string
          is_admin?: boolean | null
          stripe_account_id?: string | null
        }
      }
      threads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          content: string
          community_id: string
          user_id: string
          created_by: string
          category_id: string | null
          category_name: string | null
          pinned: boolean | null
          likes: string[] | null
          comments_count: number | null
          author_name: string | null
          author_image: string | null
          comments: Json[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          content: string
          community_id: string
          user_id: string
          created_by: string
          category_id?: string | null
          category_name?: string | null
          pinned?: boolean | null
          likes?: string[] | null
          comments_count?: number | null
          author_name?: string | null
          author_image?: string | null
          comments?: Json[] | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          content?: string
          community_id?: string
          user_id?: string
          created_by?: string
          category_id?: string | null
          category_name?: string | null
          pinned?: boolean | null
          likes?: string[] | null
          comments_count?: number | null
          author_name?: string | null
          author_image?: string | null
          comments?: Json[] | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_members_count: {
        Args: { community_id: string }
        Returns: undefined
      }
      decrement_members_count: {
        Args: { community_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type CommunityStatus = 'active' | 'pre_registration' | 'inactive'
export type MemberStatus = 'active' | 'pending' | 'inactive' | 'pending_pre_registration' | 'pre_registered'
