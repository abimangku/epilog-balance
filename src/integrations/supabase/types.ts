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
      accounting_rules: {
        Row: {
          auto_fix: boolean | null
          condition: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          psak_reference: string | null
          rule_category: string
          rule_name: string
          severity: string
        }
        Insert: {
          auto_fix?: boolean | null
          condition?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          psak_reference?: string | null
          rule_category: string
          rule_name: string
          severity: string
        }
        Update: {
          auto_fix?: boolean | null
          condition?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          psak_reference?: string | null
          rule_category?: string
          rule_name?: string
          severity?: string
        }
        Relationships: []
      }
      ai_audit: {
        Row: {
          audit_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          issues: Json | null
          metrics: Json | null
          period: string
          recommendations: string[] | null
          status: string
          summary: string | null
        }
        Insert: {
          audit_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          metrics?: Json | null
          period: string
          recommendations?: string[] | null
          status: string
          summary?: string | null
        }
        Update: {
          audit_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          metrics?: Json | null
          period?: string
          recommendations?: string[] | null
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      ai_suggestion_log: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_data: Json | null
          conversation_id: string | null
          created_at: string | null
          created_entity_id: string | null
          created_entity_type: string | null
          id: string
          message_id: string | null
          status: string
          suggested_data: Json
          suggestion_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          created_entity_id?: string | null
          created_entity_type?: string | null
          id?: string
          message_id?: string | null
          status?: string
          suggested_data: Json
          suggestion_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          created_entity_id?: string | null
          created_entity_type?: string | null
          id?: string
          message_id?: string | null
          status?: string
          suggested_data?: Json
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestion_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_message"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "bank_account_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["code"]
          },
        ]
      }
      bill_line: {
        Row: {
          amount: number
          bill_id: string
          description: string
          expense_account_code: string
          id: string
          project_code: string | null
          quantity: number
          sort_order: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          bill_id: string
          description: string
          expense_account_code: string
          id?: string
          project_code?: string | null
          quantity?: number
          sort_order?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          bill_id?: string
          description?: string
          expense_account_code?: string
          id?: string
          project_code?: string | null
          quantity?: number
          sort_order?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_line_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bill"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_expense_account_code_fkey"
            columns: ["expense_account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "bill_line_expense_account_code_fkey"
            columns: ["expense_account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["code"]
          },
        ]
      }
      cash_receipt: {
        Row: {
          amount: number
          bank_account_code: string
          client_id: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          invoice_id: string
          journal_id: string | null
          number: string
          pph23_withheld: number | null
        }
        Insert: {
          amount: number
          bank_account_code: string
          client_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          invoice_id: string
          journal_id?: string | null
          number: string
          pph23_withheld?: number | null
        }
        Update: {
          amount?: number
          bank_account_code?: string
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_id?: string
          journal_id?: string | null
          number?: string
          pph23_withheld?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_receipt_bank_account_code_fkey"
            columns: ["bank_account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_receipt_bank_account_code_fkey"
            columns: ["bank_account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_receipt_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_receipt_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_receipt_journal"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
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
      compliance_issue: {
        Row: {
          action_required: string | null
          detected_at: string | null
          id: string
          issue_type: string
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
        }
        Insert: {
          action_required?: string | null
          detected_at?: string | null
          id?: string
          issue_type: string
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
        }
        Update: {
          action_required?: string | null
          detected_at?: string | null
          id?: string
          issue_type?: string
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
        }
        Relationships: []
      }
      conversation: {
        Row: {
          archived: boolean | null
          created_at: string | null
          created_by: string
          id: string
          last_message_at: string | null
          title: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          last_message_at?: string | null
          title?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          last_message_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      conversation_message: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          project_id: string | null
          quantity: number | null
          revenue_account_code: string
          sort_order: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          description: string
          id?: string
          invoice_id: string
          project_id?: string | null
          quantity?: number | null
          revenue_account_code: string
          sort_order?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          project_id?: string | null
          quantity?: number | null
          revenue_account_code?: string
          sort_order?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_revenue_account_code_fkey"
            columns: ["revenue_account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoice_line_revenue_account_code_fkey"
            columns: ["revenue_account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["code"]
          },
        ]
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
      journal_attachment: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          journal_id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          journal_id: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          journal_id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_attachment_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "journal_line_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
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
      knowledge_base: {
        Row: {
          content: string
          created_at: string | null
          document_type: string
          id: string
          metadata: Json | null
          title: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type: string
          id?: string
          metadata?: Json | null
          title: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      period_snapshot: {
        Row: {
          account_code: string
          created_at: string | null
          credit_balance: number
          debit_balance: number
          id: string
          net_balance: number
          period: string
        }
        Insert: {
          account_code: string
          created_at?: string | null
          credit_balance?: number
          debit_balance?: number
          id?: string
          net_balance?: number
          period: string
        }
        Update: {
          account_code?: string
          created_at?: string | null
          credit_balance?: number
          debit_balance?: number
          id?: string
          net_balance?: number
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_snapshot_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "period_snapshot_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["code"]
          },
        ]
      }
      period_status: {
        Row: {
          ai_audit_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          period: string
          snapshot_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ai_audit_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          period: string
          snapshot_id?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          ai_audit_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          period?: string
          snapshot_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
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
      sales_invoice: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          due_date: string
          faktur_pajak_number: string | null
          id: string
          journal_id: string | null
          number: string
          project_id: string | null
          status: string | null
          subtotal: number
          total: number
          unbilled_revenue_recognized: number | null
          updated_at: string | null
          vat_amount: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          due_date: string
          faktur_pajak_number?: string | null
          id?: string
          journal_id?: string | null
          number: string
          project_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          unbilled_revenue_recognized?: number | null
          updated_at?: string | null
          vat_amount: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          due_date?: string
          faktur_pajak_number?: string | null
          id?: string
          journal_id?: string | null
          number?: string
          project_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          unbilled_revenue_recognized?: number | null
          updated_at?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoice_journal"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
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
      tax_rules: {
        Row: {
          created_at: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          exemptions: Json | null
          id: string
          is_active: boolean | null
          rate: number | null
          regulation_reference: string | null
          requires_npwp: boolean | null
          requires_pkp: boolean | null
          rule_type: Database["public"]["Enums"]["tax_rule_type"]
          service_category: string | null
          threshold_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effective_from: string
          effective_to?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          exemptions?: Json | null
          id?: string
          is_active?: boolean | null
          rate?: number | null
          regulation_reference?: string | null
          requires_npwp?: boolean | null
          requires_pkp?: boolean | null
          rule_type: Database["public"]["Enums"]["tax_rule_type"]
          service_category?: string | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          exemptions?: Json | null
          id?: string
          is_active?: boolean | null
          rate?: number | null
          regulation_reference?: string | null
          requires_npwp?: boolean | null
          requires_pkp?: boolean | null
          rule_type?: Database["public"]["Enums"]["tax_rule_type"]
          service_category?: string | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_rules_history: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          tax_rule_id: string | null
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          tax_rule_id?: string | null
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          tax_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_history_tax_rule_id_fkey"
            columns: ["tax_rule_id"]
            isOneToOne: false
            referencedRelation: "tax_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_attachment: {
        Row: {
          created_at: string | null
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          transaction_id: string
          transaction_type: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type?: string | null
          transaction_id: string
          transaction_type: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          transaction_id?: string
          transaction_type?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      tx_ai_suggestion: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          reasoning: string | null
          status: string
          suggested_accounts: Json
          suggested_client: string | null
          suggested_project: string | null
          suggested_type: string
          suggested_vendor: string | null
          tx_input_id: string
        }
        Insert: {
          confidence: number
          created_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          suggested_accounts: Json
          suggested_client?: string | null
          suggested_project?: string | null
          suggested_type: string
          suggested_vendor?: string | null
          tx_input_id: string
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          reasoning?: string | null
          status?: string
          suggested_accounts?: Json
          suggested_client?: string | null
          suggested_project?: string | null
          suggested_type?: string
          suggested_vendor?: string | null
          tx_input_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tx_ai_suggestion_tx_input_id_fkey"
            columns: ["tx_input_id"]
            isOneToOne: false
            referencedRelation: "tx_input"
            referencedColumns: ["id"]
          },
        ]
      }
      tx_input: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          project_code: string | null
          status: string
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          project_code?: string | null
          status?: string
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          project_code?: string | null
          status?: string
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      vendor_bill: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          due_date: string
          faktur_pajak_number: string | null
          id: string
          journal_id: string | null
          number: string
          project_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string | null
          vat_amount: number
          vendor_id: string
          vendor_invoice_number: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          due_date: string
          faktur_pajak_number?: string | null
          id?: string
          journal_id?: string | null
          number: string
          project_id?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string | null
          vat_amount?: number
          vendor_id: string
          vendor_invoice_number?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          due_date?: string
          faktur_pajak_number?: string | null
          id?: string
          journal_id?: string | null
          number?: string
          project_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string | null
          vat_amount?: number
          vendor_id?: string
          vendor_invoice_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payment: {
        Row: {
          amount: number
          bank_account_code: string
          bill_id: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          journal_id: string | null
          number: string
          pph23_withheld: number
          vendor_id: string
        }
        Insert: {
          amount: number
          bank_account_code: string
          bill_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          journal_id?: string | null
          number: string
          pph23_withheld?: number
          vendor_id: string
        }
        Update: {
          amount?: number
          bank_account_code?: string
          bill_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          journal_id?: string | null
          number?: string
          pph23_withheld?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payment_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "ap_aging_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payment_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bill"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payment_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payment_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ap_aging_summary: {
        Row: {
          aging_bucket: string | null
          balance: number | null
          category: string | null
          date: string | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          number: string | null
          project_name: string | null
          status: string | null
          total: number | null
          total_paid: number | null
          vendor_name: string | null
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          ap_total: number | null
          ar_total: number | null
          cash_balance: number | null
          mtd_expenses: number | null
          mtd_revenue: number | null
          overdue_bills: number | null
          overdue_invoices: number | null
        }
        Relationships: []
      }
      trial_balance: {
        Row: {
          balance: number | null
          code: string | null
          name: string | null
          total_credit: number | null
          total_debit: number | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_vat_position: {
        Args: { p_period: string }
        Returns: {
          net_payable: number
          ppn_keluaran: number
          ppn_masukan: number
        }[]
      }
      create_period_snapshot: {
        Args: { p_period: string }
        Returns: string
      }
      get_account_balance: {
        Args: { p_account_code: string; p_period: string }
        Returns: {
          credit_total: number
          debit_total: number
          net_balance: number
        }[]
      }
      get_balance_sheet: {
        Args: { p_as_of_date: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          balance: number
        }[]
      }
      get_cash_flow: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          account_code: string
          account_name: string
          amount: number
          category: string
        }[]
      }
      get_next_bill_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_journal_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_payment_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_receipt_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_profit_loss: {
        Args: { p_end_period: string; p_start_period: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          amount: number
        }[]
      }
      get_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          role: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_period_closed: {
        Args: { p_period: string }
        Returns: boolean
      }
      update_bill_status: {
        Args: { bill_uuid: string }
        Returns: string
      }
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
      app_role: "admin" | "user"
      bill_category: "COGS" | "OPEX"
      bill_status: "DRAFT" | "APPROVED" | "PARTIAL" | "PAID" | "CANCELLED"
      entity_type: "individual" | "company" | "government" | "kol" | "employee"
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
      tax_rule_type: "PPH21" | "PPH23" | "PPN" | "PPH_FINAL" | "FAKTUR_PAJAK"
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
      app_role: ["admin", "user"],
      bill_category: ["COGS", "OPEX"],
      bill_status: ["DRAFT", "APPROVED", "PARTIAL", "PAID", "CANCELLED"],
      entity_type: ["individual", "company", "government", "kol", "employee"],
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
      tax_rule_type: ["PPH21", "PPH23", "PPN", "PPH_FINAL", "FAKTUR_PAJAK"],
      tx_status: ["PENDING", "CLASSIFIED", "APPROVED", "REJECTED"],
    },
  },
} as const
