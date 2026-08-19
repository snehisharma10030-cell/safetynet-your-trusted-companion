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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          created_at: string
          due_at: string
          id: string
          journey_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["checkin_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at: string
          id?: string
          journey_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          id?: string
          journey_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          checkin_interval_minutes: number
          created_at: string
          destination: string
          ended_at: string | null
          id: string
          origin: string
          planned_minutes: number
          risk_factors: Json
          risk_score: number | null
          risk_source: string
          risk_summary: string | null
          started_at: string
          status: Database["public"]["Enums"]["journey_status"]
          travel_mode: string
          user_id: string
        }
        Insert: {
          checkin_interval_minutes?: number
          created_at?: string
          destination: string
          ended_at?: string | null
          id?: string
          origin: string
          planned_minutes?: number
          risk_factors?: Json
          risk_score?: number | null
          risk_source?: string
          risk_summary?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["journey_status"]
          travel_mode?: string
          user_id: string
        }
        Update: {
          checkin_interval_minutes?: number
          created_at?: string
          destination?: string
          ended_at?: string | null
          id?: string
          origin?: string
          planned_minutes?: number
          risk_factors?: Json
          risk_score?: number | null
          risk_source?: string
          risk_summary?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["journey_status"]
          travel_mode?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          profile_type: Database["public"]["Enums"]["profile_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Relationships: []
      }
      safety_reports: {
        Row: {
          category: string
          created_at: string
          id: string
          is_sample: boolean
          latitude: number
          longitude: number
          note: string
          severity: number
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_sample?: boolean
          latitude: number
          longitude: number
          note?: string
          severity?: number
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          latitude?: number
          longitude?: number
          note?: string
          severity?: number
          user_id?: string | null
        }
        Relationships: []
      }
      sos_events: {
        Row: {
          created_at: string
          id: string
          journey_id: string | null
          kind: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id?: string | null
          kind?: string
          note?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string | null
          kind?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notify_order: number
          phone: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name: string
          notify_order?: number
          phone?: string
          relationship?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notify_order?: number
          phone?: string
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      checkin_status: "pending" | "confirmed" | "missed"
      journey_status: "active" | "completed" | "cancelled"
      profile_type: "student" | "woman" | "traveller" | "family" | "other"
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
      checkin_status: ["pending", "confirmed", "missed"],
      journey_status: ["active", "completed", "cancelled"],
      profile_type: ["student", "woman", "traveller", "family", "other"],
    },
  },
} as const
