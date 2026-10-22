// Generated from the database by `npm run db:types` (supabase gen types). Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      assignment_students: {
        Row: {
          assigned_at: string;
          assignment_id: string;
          student_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assignment_id: string;
          student_id: string;
        };
        Update: {
          assigned_at?: string;
          assignment_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_students_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "account_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          created_at: string;
          due_on: string | null;
          id: string;
          instructions: string;
          teacher_id: string;
          time_limit_sec: number;
          title: string;
          updated_at: string;
          word_count: number;
          words: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          due_on?: string | null;
          id?: string;
          instructions?: string;
          teacher_id?: string;
          time_limit_sec: number;
          title: string;
          updated_at?: string;
          word_count: number;
          words: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          due_on?: string | null;
          id?: string;
          instructions?: string;
          teacher_id?: string;
          time_limit_sec?: number;
          title?: string;
          updated_at?: string;
          word_count?: number;
          words?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "account_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      practices: {
        Row: {
          assignment_id: string | null;
          ended_at: string;
          ended_early: boolean;
          id: string;
          notes: string;
          owner_id: string;
          spoken_sec: number;
          started_at: string;
          time_limit_sec: number;
          words: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          assignment_id?: string | null;
          ended_at: string;
          ended_early?: boolean;
          id: string;
          notes?: string;
          owner_id?: string;
          spoken_sec: number;
          started_at: string;
          time_limit_sec: number;
          words?: NonNullable<Json>;
        };
        Update: {
          assignment_id?: string | null;
          ended_at?: string;
          ended_early?: boolean;
          id?: string;
          notes?: string;
          owner_id?: string;
          spoken_sec?: number;
          started_at?: string;
          time_limit_sec?: number;
          words?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "practices_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practices_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "account_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practices_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          role: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          email?: string | null;
          id: string;
          role?: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          role?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      words: {
        Row: {
          created_at: string;
          id: string;
          image_path: string | null;
          meaning: string;
          owner_id: string;
          reading: string;
          tags: string[];
          updated_at: string;
          word: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          image_path?: string | null;
          meaning: string;
          owner_id?: string;
          reading: string;
          tags?: string[];
          updated_at?: string;
          word: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string | null;
          meaning?: string;
          owner_id?: string;
          reading?: string;
          tags?: string[];
          updated_at?: string;
          word?: string;
        };
        Relationships: [
          {
            foreignKeyName: "words_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "account_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "words_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      account_summaries: {
        Row: {
          created_at: string | null;
          display_name: string | null;
          email: string | null;
          id: string | null;
          last_practice_at: string | null;
          practice_count: number | null;
          role: string | null;
          spoken_sec: number | null;
          username: string | null;
          word_count: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string | null;
          last_practice_at?: never;
          practice_count?: never;
          role?: string | null;
          spoken_sec?: never;
          username?: string | null;
          word_count?: never;
        };
        Update: {
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string | null;
          last_practice_at?: never;
          practice_count?: never;
          role?: string | null;
          spoken_sec?: never;
          username?: string | null;
          word_count?: never;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_assigned: { Args: { assignment: string }; Returns: boolean };
      is_teacher: { Args: Record<PropertyKey, never>; Returns: boolean };
      reset_student_password: {
        Args: { new_password: string; target: string };
        Returns: undefined;
      };
      set_account_role: { Args: { new_role: string; target: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
