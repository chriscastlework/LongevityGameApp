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
      profiles: {
        Row: {
          id: string
          updated_at: string
          first_name: string | null
          last_name: string | null
          email: string
          avatar_url: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string
          first_name?: string | null
          last_name?: string | null
          email: string
          avatar_url?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
          avatar_url?: string | null
          role?: string | null
          created_at?: string
        }
      }
      competitions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          slug: string
          description: string | null
          status: 'draft' | 'active' | 'completed' | 'cancelled'
          start_date: string
          end_date: string
          entry_limit: number | null
          entry_count: number
          created_by: string
          category: string | null
          prize_info: Json | null
          rules: string | null
          is_featured: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          slug: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          start_date: string
          end_date: string
          entry_limit?: number | null
          entry_count?: number
          created_by: string
          category?: string | null
          prize_info?: Json | null
          rules?: string | null
          is_featured?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          slug?: string
          description?: string | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          start_date?: string
          end_date?: string
          entry_limit?: number | null
          entry_count?: number
          created_by?: string
          category?: string | null
          prize_info?: Json | null
          rules?: string | null
          is_featured?: boolean
        }
      }
      competition_entries: {
        Row: {
          id: string
          created_at: string
          competition_id: string
          user_id: string
          status: 'pending' | 'confirmed' | 'cancelled'
          entry_data: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          competition_id: string
          user_id: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          entry_data?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          competition_id?: string
          user_id?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          entry_data?: Json | null
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

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Competition = Database['public']['Tables']['competitions']['Row']
export type CompetitionEntry = Database['public']['Tables']['competition_entries']['Row']