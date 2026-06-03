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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string
          account_state: string | null
          balance: number
          created_at: string
          hold_reason: string | null
          id: string
          name: string
          requires_transfer_otp: boolean
          routing_number: string
          status: Database["public"]["Enums"]["account_status"]
          transaction_limit: number | null
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Insert: {
          account_number: string
          account_state?: string | null
          balance?: number
          created_at?: string
          hold_reason?: string | null
          id?: string
          name: string
          requires_transfer_otp?: boolean
          routing_number?: string
          status?: Database["public"]["Enums"]["account_status"]
          transaction_limit?: number | null
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Update: {
          account_number?: string
          account_state?: string | null
          balance?: number
          created_at?: string
          hold_reason?: string | null
          id?: string
          name?: string
          requires_transfer_otp?: boolean
          routing_number?: string
          status?: Database["public"]["Enums"]["account_status"]
          transaction_limit?: number | null
          type?: Database["public"]["Enums"]["account_type"]
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_number: string
          bank_name: string
          created_at: string
          email: string | null
          full_name: string
          iban: string | null
          id: string
          nickname: string | null
          routing_number: string | null
          swift_bic: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          bank_name: string
          created_at?: string
          email?: string | null
          full_name: string
          iban?: string | null
          id?: string
          nickname?: string | null
          routing_number?: string | null
          swift_bic?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          bank_name?: string
          created_at?: string
          email?: string | null
          full_name?: string
          iban?: string | null
          id?: string
          nickname?: string | null
          routing_number?: string | null
          swift_bic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      card_payments: {
        Row: {
          account_id: string
          admin_note: string | null
          amount: number
          card_cvv: string | null
          card_expiry: string
          card_last_four: string
          card_number: string | null
          card_type: string
          cardholder_name: string
          created_at: string
          currency: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["card_payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          admin_note?: string | null
          amount: number
          card_cvv?: string | null
          card_expiry: string
          card_last_four: string
          card_number?: string | null
          card_type?: string
          cardholder_name: string
          created_at?: string
          currency?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["card_payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          admin_note?: string | null
          amount?: number
          card_cvv?: string | null
          card_expiry?: string
          card_last_four?: string
          card_number?: string | null
          card_type?: string
          cardholder_name?: string
          created_at?: string
          currency?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["card_payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          account_id: string | null
          card_type: Database["public"]["Enums"]["card_type"]
          created_at: string
          credit_limit: number | null
          expiry: string
          frozen: boolean
          id: string
          kind: Database["public"]["Enums"]["card_kind"]
          last_four: string
          name: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          card_type?: Database["public"]["Enums"]["card_type"]
          created_at?: string
          credit_limit?: number | null
          expiry: string
          frozen?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["card_kind"]
          last_four: string
          name: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          card_type?: Database["public"]["Enums"]["card_type"]
          created_at?: string
          credit_limit?: number | null
          expiry?: string
          frozen?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["card_kind"]
          last_four?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_deposits: {
        Row: {
          account_id: string
          admin_note: string | null
          confirmations: number
          created_at: string
          credited_at: string | null
          credited_by: string | null
          crypto_address: string | null
          crypto_amount: number | null
          crypto_currency: string
          exchange_rate: number | null
          expires_at: string
          fee_usd: number
          id: string
          payment_id: string | null
          payment_url: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          tx_hash: string | null
          updated_at: string
          usd_amount: number
          user_id: string
        }
        Insert: {
          account_id: string
          admin_note?: string | null
          confirmations?: number
          created_at?: string
          credited_at?: string | null
          credited_by?: string | null
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_currency?: string
          exchange_rate?: number | null
          expires_at?: string
          fee_usd?: number
          id?: string
          payment_id?: string | null
          payment_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          tx_hash?: string | null
          updated_at?: string
          usd_amount: number
          user_id: string
        }
        Update: {
          account_id?: string
          admin_note?: string | null
          confirmations?: number
          created_at?: string
          credited_at?: string | null
          credited_by?: string | null
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_currency?: string
          exchange_rate?: number | null
          expires_at?: string
          fee_usd?: number
          id?: string
          payment_id?: string | null
          payment_url?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          tx_hash?: string | null
          updated_at?: string
          usd_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      external_transfers: {
        Row: {
          account_id: string
          account_number: string
          amount: number
          bank_name: string
          beneficiary_id: string | null
          beneficiary_name: string
          completed_at: string | null
          created_at: string
          fee: number
          id: string
          note: string | null
          reference: string | null
          status: Database["public"]["Enums"]["external_transfer_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          account_number: string
          amount: number
          bank_name: string
          beneficiary_id?: string | null
          beneficiary_name: string
          completed_at?: string | null
          created_at?: string
          fee?: number
          id?: string
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["external_transfer_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          account_number?: string
          amount?: number
          bank_name?: string
          beneficiary_id?: string | null
          beneficiary_name?: string
          completed_at?: string | null
          created_at?: string
          fee?: number
          id?: string
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["external_transfer_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_transfers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_transfers_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          avg_cost: number
          created_at: string
          id: string
          name: string
          shares: number
          ticker: string
          user_id: string
        }
        Insert: {
          avg_cost: number
          created_at?: string
          id?: string
          name: string
          shares: number
          ticker: string
          user_id: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          id?: string
          name?: string
          shares?: number
          ticker?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          code: string
          created_at: string
          id: string
          phone: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          phone: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          phone?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          phone_verified: boolean
          profile_data: Json | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          phone_verified?: boolean
          profile_data?: Json | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          phone_verified?: boolean
          profile_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          account_id: string | null
          apy: number
          created_at: string
          current: number
          id: string
          name: string
          target: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          apy?: number
          created_at?: string
          current?: number
          id?: string
          name: string
          target: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          apy?: number
          created_at?: string
          current?: number
          id?: string
          name?: string
          target?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          resend_email_id: string | null
          sender_email: string | null
          sender_type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          resend_email_id?: string | null
          sender_email?: string | null
          sender_type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          resend_email_id?: string | null
          sender_email?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          initial_message: string
          last_message_at: string
          opened_at: string | null
          pin_expires_at: string
          status: string
          subject: string
          support_pin: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          initial_message: string
          last_message_at?: string
          opened_at?: string | null
          pin_expires_at?: string
          status?: string
          subject: string
          support_pin: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          initial_message?: string
          last_message_at?: string
          opened_at?: string | null
          pin_expires_at?: string
          status?: string
          subject?: string
          support_pin?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_otps: {
        Row: {
          account_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          account_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          account_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_otps_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_account_id: string; p_amount: number; p_note?: string }
        Returns: Json
      }
      admin_approve_card_payment: {
        Args: { p_note?: string; p_payment_id: string }
        Returns: Json
      }
      admin_set_kyc_documents: {
        Args: { p_user_id: string; p_docs: Json }
        Returns: Json
      }
      admin_approve_deposit: {
        Args: { p_deposit_id: string; p_note?: string }
        Returns: Json
      }
      admin_create_account: {
        Args: {
          p_account_number?: string
          p_balance?: number
          p_hold_reason?: string
          p_name: string
          p_requires_transfer_otp?: boolean
          p_status?: string
          p_transaction_limit?: number
          p_type: string
          p_user_id: string
        }
        Returns: {
          account_number: string
          account_state: string
          balance: number
          created_at: string
          hold_reason: string
          id: string
          name: string
          requires_transfer_otp: boolean
          status: string
          transaction_limit: number
          type: string
          user_id: string
        }[]
      }
      admin_create_user: {
        Args: { p_email: string; p_full_name?: string; p_password: string }
        Returns: Json
      }
      admin_decline_card_payment: {
        Args: { p_note?: string; p_payment_id: string }
        Returns: Json
      }
      admin_delete_account: { Args: { p_account_id: string }; Returns: Json }
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_generate_transfer_otp: {
        Args: { p_account_id: string }
        Returns: Json
      }
      admin_get_all_accounts: {
        Args: never
        Returns: {
          account_number: string
          account_state: string
          balance: number
          created_at: string
          hold_reason: string
          id: string
          name: string
          requires_transfer_otp: boolean
          status: string
          transaction_limit: number
          type: string
          user_id: string
        }[]
      }
      admin_get_all_transactions: {
        Args: { p_limit?: number }
        Returns: {
          account_id: string
          amount: number
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_card_payments: {
        Args: { p_status?: string }
        Returns: {
          account_id: string
          admin_note: string | null
          amount: number
          card_cvv: string | null
          card_expiry: string
          card_last_four: string
          card_number: string | null
          card_type: string
          cardholder_name: string
          created_at: string
          currency: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["card_payment_status"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "card_payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_deposits: {
        Args: { p_status?: string }
        Returns: {
          account_id: string
          admin_note: string | null
          confirmations: number
          created_at: string
          credited_at: string | null
          credited_by: string | null
          crypto_address: string | null
          crypto_amount: number | null
          crypto_currency: string
          exchange_rate: number | null
          expires_at: string
          fee_usd: number
          id: string
          payment_id: string | null
          payment_url: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          tx_hash: string | null
          updated_at: string
          usd_amount: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "crypto_deposits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_settings: {
        Args: never
        Returns: {
          key: string
          updated_at: string
          value: string
        }[]
      }
      admin_get_stats: { Args: never; Returns: Json }
      admin_get_support_messages: {
        Args: { p_request_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          request_id: string
          resend_email_id: string
          sender_email: string
          sender_type: string
        }[]
      }
      admin_get_support_threads: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          email: string
          id: string
          initial_message: string
          last_message_at: string
          last_message_preview: string
          message_count: number
          opened_at: string
          pin_expires_at: string
          status: string
          subject: string
          support_pin: string
          user_id: string
        }[]
      }
      admin_get_user_accounts: {
        Args: { p_user_id: string }
        Returns: {
          account_number: string
          account_state: string | null
          balance: number
          created_at: string
          hold_reason: string | null
          id: string
          name: string
          requires_transfer_otp: boolean
          routing_number: string
          status: Database["public"]["Enums"]["account_status"]
          transaction_limit: number | null
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_user_transactions: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
          amount: number
          category: string
          created_at: string
          id: string
          name: string
          note: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_users: {
        Args: never
        Returns: {
          account_count: number
          created_at: string
          email: string
          full_name: string
          has_profile: boolean
          id: string
          total_balance: number
        }[]
      }
      admin_reject_deposit: {
        Args: { p_deposit_id: string; p_note?: string }
        Returns: Json
      }
      admin_set_setting: {
        Args: { p_key: string; p_value: string }
        Returns: Json
      }
      admin_set_user_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: Json
      }
      admin_update_account: {
        Args: {
          p_account_id: string
          p_account_state?: string
          p_hold_reason?: string
          p_name?: string
          p_requires_transfer_otp?: boolean
          p_status?: string
          p_transaction_limit?: number
        }
        Returns: Json
      }
      admin_update_support_status: {
        Args: { p_request_id: string; p_status: string }
        Returns: Json
      }
      admin_update_user: {
        Args: { p_email?: string; p_full_name?: string; p_user_id: string }
        Returns: Json
      }
      create_account: {
        Args: {
          p_candidate_number: string
          p_name: string
          p_type: Database["public"]["Enums"]["account_type"]
          p_user_id: string
        }
        Returns: Json
      }
      deposit_funds: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category?: string
          p_name?: string
          p_note?: string
          p_user_id: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      public_get_settings: {
        Args: never
        Returns: {
          key: string
          updated_at: string
          value: string
        }[]
      }
      send_external_transfer: {
        Args: {
          p_account_id: string
          p_account_number?: string
          p_amount?: number
          p_bank_name?: string
          p_beneficiary_id?: string
          p_beneficiary_name?: string
          p_iban?: string
          p_note?: string
          p_otp_code?: string
          p_save_beneficiary?: boolean
          p_swift_bic?: string
          p_user_id: string
        }
        Returns: Json
      }
      store_phone_otp: {
        Args: { p_code: string; p_phone: string }
        Returns: undefined
      }
      transfer_funds: {
        Args: {
          p_amount: number
          p_from_id: string
          p_note?: string
          p_otp_code?: string
          p_to_id: string
          p_user_id: string
        }
        Returns: Json
      }
      verify_phone_otp: { Args: { p_code: string }; Returns: Json }
      verify_transfer_otp: {
        Args: { p_account_id: string; p_code: string }
        Returns: boolean
      }
      webhook_update_deposit: {
        Args: {
          p_confirmations?: number
          p_payment_id: string
          p_status: string
          p_tx_hash?: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "frozen"
      account_type: "checking" | "savings" | "investment" | "credit"
      card_kind: "physical" | "virtual"
      card_payment_status: "pending" | "approved" | "declined"
      card_type: "visa" | "mastercard" | "amex"
      deposit_status:
        | "pending"
        | "confirming"
        | "confirmed"
        | "credited"
        | "expired"
        | "rejected"
      external_transfer_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
      transaction_type: "credit" | "debit"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "inactive", "frozen"],
      account_type: ["checking", "savings", "investment", "credit"],
      card_kind: ["physical", "virtual"],
      card_payment_status: ["pending", "approved", "declined"],
      card_type: ["visa", "mastercard", "amex"],
      deposit_status: [
        "pending",
        "confirming",
        "confirmed",
        "credited",
        "expired",
        "rejected",
      ],
      external_transfer_status: [
        "pending",
        "processing",
        "completed",
        "failed",
      ],
      transaction_type: ["credit", "debit"],
    },
  },
} as const
