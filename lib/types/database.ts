export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      health_assessments: {
        Row: {
          assessment_data: Json
          completed_at: string | null
          created_at: string | null
          id: string
          participant_id: string
        }
        Insert: {
          assessment_data: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          participant_id: string
        }
        Update: {
          assessment_data?: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_assessments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          agreement_accepted: boolean | null
          agreement_accepted_at: string | null
          created_at: string | null
          id: string
          participant_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agreement_accepted?: boolean | null
          agreement_accepted_at?: string | null
          created_at?: string | null
          id?: string
          participant_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agreement_accepted?: boolean | null
          agreement_accepted_at?: string | null
          created_at?: string | null
          id?: string
          participant_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string
          email: string
          gender: string
          id: string
          job_title: string
          name: string
          organisation: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth: string
          email: string
          gender: string
          id: string
          job_title: string
          name: string
          organisation: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string
          email?: string
          gender?: string
          id?: string
          job_title?: string
          name?: string
          organisation?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          operator_id: string
          participant_id: string
          recorded_at: string | null
          score: number
          station_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          participant_id: string
          recorded_at?: string | null
          score: number
          station_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          participant_id?: string
          recorded_at?: string | null
          score?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "station_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_operators: {
        Row: {
          created_at: string | null
          id: string
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_operators_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_results: {
        Row: {
          created_at: string
          id: string
          measurements: Json
          participant_id: string
          recorded_by: string
          station_id: string
          station_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurements: Json
          participant_id: string
          recorded_by: string
          station_id: string
          station_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurements?: Json
          participant_id?: string
          recorded_by?: string
          station_id?: string
          station_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_results_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_results_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          color_class: string | null
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          station_type: string | null
          updated_at: string | null
        }
        Insert: {
          color_class?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          station_type?: string | null
          updated_at?: string | null
        }
        Update: {
          color_class?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          station_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authorize_role: {
        Args: { required_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      compute_scores_for_participant: {
        Args: { p_id: string }
        Returns: undefined
      }
      generate_participant_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      public_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          full_name: string
          gender: string
          grade: string
          organization: string
          participant_code: string
          rank: number
          score_balance: number
          score_breath: number
          score_grip: number
          score_health: number
          total_score: number
        }[]
      }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "participant" | "operator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["participant", "operator", "admin"],
    },
  },
} as const

// Custom application types
export type Grade = "Above Average" | "Average" | "Bad";

export type StationType = "balance" | "breath" | "grip" | "health";

export interface BalanceMeasurement {
  balance_seconds: number;
}

export interface BreathMeasurement {
  balloon_diameter_cm: number;
}

export interface GripMeasurement {
  grip_seconds: number;
}

export interface HealthMeasurement {
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  bmi: number;
  muscle_pct: number;
  fat_pct: number;
  spo2: number;
}

export interface LeaderboardEntry {
  id: string;
  participant_code: string;
  full_name: string;
  organization: string | null;
  gender: string;
  score_balance: number | null;
  score_breath: number | null;
  score_grip: number | null;
  score_health: number | null;
  total_score: number | null;
  grade: Grade | null;
  created_at: string;
  rank: number;
}

export type StationResultInsert = TablesInsert<"station_results">;

// Additional type exports for existing code compatibility
export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Tables<"profiles">;
export type Station = Tables<"stations">;
export type StationUpdate = TablesUpdate<"stations">;
export type ParticipantProfileInsert = TablesInsert<"profiles">;

// Re-export SignupFormData from auth types if it exists
export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: string;
  organisation: string;
  jobTitle: string;
}
