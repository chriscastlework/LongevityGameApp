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
          is_admin: boolean
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
          is_admin?: boolean
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
          is_admin?: boolean
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

      // Competitions table
      competitions: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          start_date: string
          end_date: string
          max_participants: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          start_date: string
          end_date: string
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          start_date?: string
          end_date?: string
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Competition entries table
      competition_entries: {
        Row: {
          id: string
          competition_id: string
          user_id: string
          score: number
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          user_id: string
          score?: number
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          competition_id?: string
          user_id?: string
          score?: number
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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

// Competition types
export type Competition = Database['public']['Tables']['competitions']['Row']
export type CompetitionInsert = Database['public']['Tables']['competitions']['Insert']
export type CompetitionUpdate = Database['public']['Tables']['competitions']['Update']

export type CompetitionEntry = Database['public']['Tables']['competition_entries']['Row']
export type CompetitionEntryInsert = Database['public']['Tables']['competition_entries']['Insert']
export type CompetitionEntryUpdate = Database['public']['Tables']['competition_entries']['Update']

// Station and measurement types
export type StationType = 'balance' | 'breath' | 'grip' | 'health';
export type Grade = 'Above Average' | 'Average' | 'Bad' | null;

export interface LeaderboardEntry {
  id: string;
  participant_code: string;
  full_name: string;
  organization: string | null;
  gender: 'male' | 'female' | 'other';
  score_balance: number | null;
  score_breath: number | null;
  score_grip: number | null;
  score_health: number | null;
  total_score: number | null;
  grade: Grade;
  created_at: string;
  rank: number;
}

export interface BalanceMeasurement {
  balance_seconds: number;
}

// For backward compatibility
export type Profile = ParticipantProfile

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