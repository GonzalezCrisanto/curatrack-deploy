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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      evolutions: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          evolution_date: string
          evolution_time: string | null
          healing_frequency: string | null
          id: string
          materials: string | null
          next_control: string | null
          observations: string | null
          procedure: string | null
          professional: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          evolution_date: string
          evolution_time?: string | null
          healing_frequency?: string | null
          id?: string
          materials?: string | null
          next_control?: string | null
          observations?: string | null
          procedure?: string | null
          professional?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          evolution_date?: string
          evolution_time?: string | null
          healing_frequency?: string | null
          id?: string
          materials?: string | null
          next_control?: string | null
          observations?: string | null
          procedure?: string | null
          professional?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolutions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "wound_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          admission_date: string | null
          age: number | null
          assigned_professional: string | null
          control_interval_days: number | null
          created_at: string
          diagnosis: string | null
          dni: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          observations: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          age?: number | null
          assigned_professional?: string | null
          control_interval_days?: number | null
          created_at?: string
          diagnosis?: string | null
          dni?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          observations?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          age?: number | null
          assigned_professional?: string | null
          control_interval_days?: number | null
          created_at?: string
          diagnosis?: string | null
          dni?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          observations?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          case_id: string | null
          created_at: string
          evolution_id: string | null
          id: string
          photo_date: string | null
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          case_id?: string | null
          created_at?: string
          evolution_id?: string | null
          id?: string
          photo_date?: string | null
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          case_id?: string | null
          created_at?: string
          evolution_id?: string | null
          id?: string
          photo_date?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "wound_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "evolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          institution: string | null
          last_name: string
          license: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id?: string
          institution?: string | null
          last_name?: string
          license?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          institution?: string | null
          last_name?: string
          license?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wound_cases: {
        Row: {
          anatomical_location: string | null
          created_at: string
          depth: string | null
          exudate: string | null
          id: string
          infection: string | null
          pain: string | null
          patient_id: string
          size: string | null
          start_date: string | null
          status: string
          treatment: string | null
          updated_at: string
          user_id: string
          wound_type: string
        }
        Insert: {
          anatomical_location?: string | null
          created_at?: string
          depth?: string | null
          exudate?: string | null
          id?: string
          infection?: string | null
          pain?: string | null
          patient_id: string
          size?: string | null
          start_date?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
          user_id: string
          wound_type: string
        }
        Update: {
          anatomical_location?: string | null
          created_at?: string
          depth?: string | null
          exudate?: string | null
          id?: string
          infection?: string | null
          pain?: string | null
          patient_id?: string
          size?: string | null
          start_date?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
          user_id?: string
          wound_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wound_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professional"
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
      app_role: ["admin", "professional"],
    },
  },
} as const
