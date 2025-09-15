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
      // Participants table - links to auth users
      participants: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // Profiles table - stores user data, linked to auth.users via foreign key
      profiles: {
        Row: {
          id: string // Must match auth.users.id
          name: string
          email: string
          date_of_birth: string
          gender: 'male' | 'female'
          job_title: string
          organisation: string // British spelling
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string // Must be auth user ID
          name: string
          email: string
          date_of_birth: string
          gender: 'male' | 'female'
          job_title: string
          organisation: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          date_of_birth?: string
          gender?: 'male' | 'female'
          job_title?: string
          organisation?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type ParticipantProfile = Database['public']['Tables']['profiles']['Row']
export type ParticipantProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ParticipantProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Gender = 'male' | 'female'

// Form data interface for signup
export interface SignupFormData {
  fullName: string
  dateOfBirth: string
  gender: Gender
  jobTitle: string
  organization: string // American spelling in forms
  email?: string | null
  phone?: string | null
  consentWellness: boolean
  consentLiability: boolean
  consentData: boolean
  password?: string
}