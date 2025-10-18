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
      account: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_code: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_code?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_code?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_account: {
        Row: {
          account_code: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          account_code: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          account_code?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
        ]
      }
      client: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: number | null
          phone: string | null
          tax_id: string | null
          updated_at: string | null
          withholds_pph23: boolean | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          withholds_pph23?: boolean | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          withholds_pph23?: boolean | null
        }
        Relationships: []
      }
      journal: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          is_locked: boolean | null
          number: string
          period: string
          source_doc_id: string | null
          source_doc_type: string | null
          status: Database["public"]["Enums"]["journal_status"] | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          is_locked?: boolean | null
          number: string
          period: string
          source_doc_id?: string | null
          source_doc_type?: string | null
          status?: Database["public"]["Enums"]["journal_status"] | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          is_locked?: boolean | null
          number?: string
          period?: string
          source_doc_id?: string | null
          source_doc_type?: string | null
          status?: Database["public"]["Enums"]["journal_status"] | null
        }
        Relationships: []
      }
      journal_line: {
        Row: {
          account_code: string
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_id: string
          project_code: string | null
          sort_order: number | null
        }
        Insert: {
          account_code: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id: string
          project_code?: string | null
          sort_order?: number | null
        }
        Update: {
          account_code?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id?: string
          project_code?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_line_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "journal_line_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
          },
        ]
      }
      project: {
        Row: {
          client_id: string | null
          code: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          code: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      vendor: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: number | null
          phone: string | null
          pph23_rate: number | null
          provides_faktur_pajak: boolean | null
          subject_to_pph23: boolean | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: number | null
          phone?: string | null
          pph23_rate?: number | null
          provides_faktur_pajak?: boolean | null
          subject_to_pph23?: boolean | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: number | null
          phone?: string | null
          pph23_rate?: number | null
          provides_faktur_pajak?: boolean | null
          subject_to_pph23?: boolean | null
          tax_id?: string | null
          updated_at?: string | null
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
      account_type:
        | "ASSET"
        | "LIABILITY"
        | "EQUITY"
        | "REVENUE"
        | "COGS"
        | "OPEX"
        | "OTHER_INCOME"
        | "OTHER_EXPENSE"
        | "TAX_EXPENSE"
      bill_category: "COGS" | "OPEX"
      bill_status: "DRAFT" | "APPROVED" | "PARTIAL" | "PAID" | "CANCELLED"
      invoice_status:
        | "DRAFT"
        | "SENT"
        | "PARTIAL"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
      journal_status: "DRAFT" | "POSTED" | "REVERSED"
      project_status: "ACTIVE" | "COMPLETED" | "ON_HOLD"
      suggestion_status: "PENDING" | "ACCEPTED" | "EDITED" | "REJECTED"
      tx_status: "PENDING" | "CLASSIFIED" | "APPROVED" | "REJECTED"
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
      account_type: [
        "ASSET",
        "LIABILITY",
        "EQUITY",
        "REVENUE",
        "COGS",
        "OPEX",
        "OTHER_INCOME",
        "OTHER_EXPENSE",
        "TAX_EXPENSE",
      ],
      bill_category: ["COGS", "OPEX"],
      bill_status: ["DRAFT", "APPROVED", "PARTIAL", "PAID", "CANCELLED"],
      invoice_status: [
        "DRAFT",
        "SENT",
        "PARTIAL",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      journal_status: ["DRAFT", "POSTED", "REVERSED"],
      project_status: ["ACTIVE", "COMPLETED", "ON_HOLD"],
      suggestion_status: ["PENDING", "ACCEPTED", "EDITED", "REJECTED"],
      tx_status: ["PENDING", "CLASSIFIED", "APPROVED", "REJECTED"],
    },
  },
} as const
