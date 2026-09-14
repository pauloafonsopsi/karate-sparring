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
      config: {
        Row: {
          chave: string
          valor: string | null
        }
        Insert: {
          chave: string
          valor?: string | null
        }
        Update: {
          chave?: string
          valor?: string | null
        }
        Relationships: []
      }
      leads_atletas: {
        Row: {
          aceite_lgpd: boolean
          cidade: string | null
          convertido_em: string | null
          created_at: string | null
          email: string
          greenn_sale_id: string | null
          id: string
          nome: string
          produto_escolhido: string | null
          sensei_id: string | null
          status: string
          uf: string
          whatsapp: string
        }
        Insert: {
          aceite_lgpd?: boolean
          cidade?: string | null
          convertido_em?: string | null
          created_at?: string | null
          email: string
          greenn_sale_id?: string | null
          id?: string
          nome: string
          produto_escolhido?: string | null
          sensei_id?: string | null
          status?: string
          uf: string
          whatsapp: string
        }
        Update: {
          aceite_lgpd?: boolean
          cidade?: string | null
          convertido_em?: string | null
          created_at?: string | null
          email?: string
          greenn_sale_id?: string | null
          id?: string
          nome?: string
          produto_escolhido?: string | null
          sensei_id?: string | null
          status?: string
          uf?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_atletas_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_atletas_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          billing_type: string
          created_at: string
          id: string
          invoice_url: string | null
          lead_id: string | null
          payload: Json | null
          produto: string
          provedor: string
          sensei_id: string | null
          status: string
          updated_at: string
          valor_sensei: number
          valor_total: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_type: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          lead_id?: string | null
          payload?: Json | null
          produto: string
          provedor?: string
          sensei_id?: string | null
          status?: string
          updated_at?: string
          valor_sensei: number
          valor_total: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          lead_id?: string | null
          payload?: Json | null
          produto?: string
          provedor?: string
          sensei_id?: string | null
          status?: string
          updated_at?: string
          valor_sensei?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_orfaos: {
        Row: {
          conciliado: boolean | null
          created_at: string | null
          documento_pagador: string | null
          email_pagador: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          sale_id: string | null
        }
        Insert: {
          conciliado?: boolean | null
          created_at?: string | null
          documento_pagador?: string | null
          email_pagador?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          sale_id?: string | null
        }
        Update: {
          conciliado?: boolean | null
          created_at?: string | null
          documento_pagador?: string | null
          email_pagador?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_orfaos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_atletas"
            referencedColumns: ["id"]
          },
        ]
      }
      sensei_users: {
        Row: {
          created_at: string
          sensei_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sensei_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sensei_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensei_users_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensei_users_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      senseis: {
        Row: {
          adesao_paga: boolean
          asaas_account_id: string | null
          asaas_status: string | null
          asaas_wallet_id: string | null
          cidade: string
          created_at: string | null
          data_adesao: string | null
          dojo: string
          email: string
          foto_url: string | null
          graduacao: string | null
          id: string
          instagram: string | null
          link_afiliado_avulso: string | null
          link_afiliado_mensal: string | null
          nome: string
          obs: string | null
          piloto: boolean
          status: string
          tempo_ensino: string | null
          uf: string
          whatsapp: string
        }
        Insert: {
          adesao_paga?: boolean
          asaas_account_id?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          cidade: string
          created_at?: string | null
          data_adesao?: string | null
          dojo: string
          email: string
          foto_url?: string | null
          graduacao?: string | null
          id?: string
          instagram?: string | null
          link_afiliado_avulso?: string | null
          link_afiliado_mensal?: string | null
          nome: string
          obs?: string | null
          piloto?: boolean
          status?: string
          tempo_ensino?: string | null
          uf: string
          whatsapp: string
        }
        Update: {
          adesao_paga?: boolean
          asaas_account_id?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          cidade?: string
          created_at?: string | null
          data_adesao?: string | null
          dojo?: string
          email?: string
          foto_url?: string | null
          graduacao?: string | null
          id?: string
          instagram?: string | null
          link_afiliado_avulso?: string | null
          link_afiliado_mensal?: string | null
          nome?: string
          obs?: string | null
          piloto?: boolean
          status?: string
          tempo_ensino?: string | null
          uf?: string
          whatsapp?: string
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
      webhook_log: {
        Row: {
          created_at: string | null
          evento_id: string | null
          id: string
          payload: Json
          processado: boolean | null
          provedor: string
          resultado: string | null
          sale_id: string | null
        }
        Insert: {
          created_at?: string | null
          evento_id?: string | null
          id?: string
          payload: Json
          processado?: boolean | null
          provedor?: string
          resultado?: string | null
          sale_id?: string | null
        }
        Update: {
          created_at?: string | null
          evento_id?: string | null
          id?: string
          payload?: Json
          processado?: boolean | null
          provedor?: string
          resultado?: string | null
          sale_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      senseis_publicos: {
        Row: {
          cidade: string | null
          dojo: string | null
          foto_url: string | null
          graduacao: string | null
          id: string | null
          nome: string | null
          piloto: boolean | null
          uf: string | null
        }
        Insert: {
          cidade?: string | null
          dojo?: string | null
          foto_url?: string | null
          graduacao?: string | null
          id?: string | null
          nome?: string | null
          piloto?: boolean | null
          uf?: string | null
        }
        Update: {
          cidade?: string | null
          dojo?: string | null
          foto_url?: string | null
          graduacao?: string | null
          id?: string | null
          nome?: string | null
          piloto?: boolean | null
          uf?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_sensei_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sensei"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "sensei"],
    },
  },
} as const
