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
      atleta_dojos: {
        Row: {
          ate: string | null
          atleta_id: string
          autorizado_em: string | null
          autorizado_por: string | null
          created_at: string
          desde: string
          id: string
          obs: string | null
          origem: string
          recusa_motivo: string | null
          sensei_id: string
          solicitado_em: string
          status_autorizacao: string
          unidade_id: string | null
        }
        Insert: {
          ate?: string | null
          atleta_id: string
          autorizado_em?: string | null
          autorizado_por?: string | null
          created_at?: string
          desde?: string
          id?: string
          obs?: string | null
          origem?: string
          recusa_motivo?: string | null
          sensei_id: string
          solicitado_em?: string
          status_autorizacao?: string
          unidade_id?: string | null
        }
        Update: {
          ate?: string | null
          atleta_id?: string
          autorizado_em?: string | null
          autorizado_por?: string | null
          created_at?: string
          desde?: string
          id?: string
          obs?: string | null
          origem?: string
          recusa_motivo?: string | null
          sensei_id?: string
          solicitado_em?: string
          status_autorizacao?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atleta_dojos_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atleta_dojos_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atleta_dojos_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atleta_dojos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      atletas: {
        Row: {
          aceite_lgpd: boolean
          aceite_marketing_eventos: boolean
          aceite_ranking: boolean
          aceite_termos: boolean
          aceites_em: string | null
          created_at: string
          data_nascimento: string
          email: string
          faixa: string | null
          id: string
          nome: string
          pais: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          aceite_lgpd?: boolean
          aceite_marketing_eventos?: boolean
          aceite_ranking?: boolean
          aceite_termos?: boolean
          aceites_em?: string | null
          created_at?: string
          data_nascimento: string
          email: string
          faixa?: string | null
          id: string
          nome: string
          pais?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          aceite_lgpd?: boolean
          aceite_marketing_eventos?: boolean
          aceite_ranking?: boolean
          aceite_termos?: boolean
          aceites_em?: string | null
          created_at?: string
          data_nascimento?: string
          email?: string
          faixa?: string | null
          id?: string
          nome?: string
          pais?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
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
      dojo_alfinete_historico: {
        Row: {
          alterado_por: string | null
          created_at: string
          id: string
          latitude_antiga: number | null
          latitude_nova: number | null
          longitude_antiga: number | null
          longitude_nova: number | null
          sensei_id: string
        }
        Insert: {
          alterado_por?: string | null
          created_at?: string
          id?: string
          latitude_antiga?: number | null
          latitude_nova?: number | null
          longitude_antiga?: number | null
          longitude_nova?: number | null
          sensei_id: string
        }
        Update: {
          alterado_por?: string | null
          created_at?: string
          id?: string
          latitude_antiga?: number | null
          latitude_nova?: number | null
          longitude_antiga?: number | null
          longitude_nova?: number | null
          sensei_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_alfinete_historico_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dojo_alfinete_historico_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      filiacoes: {
        Row: {
          alterada_em: string | null
          assinatura_externa_id: string | null
          ativada_em: string | null
          atleta_id: string | null
          created_at: string
          decidido_por: string | null
          id: string
          motivo: string | null
          obs: string | null
          provedor: string
          sensei_id: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          alterada_em?: string | null
          assinatura_externa_id?: string | null
          ativada_em?: string | null
          atleta_id?: string | null
          created_at?: string
          decidido_por?: string | null
          id?: string
          motivo?: string | null
          obs?: string | null
          provedor?: string
          sensei_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          alterada_em?: string | null
          assinatura_externa_id?: string | null
          ativada_em?: string | null
          atleta_id?: string | null
          created_at?: string
          decidido_por?: string | null
          id?: string
          motivo?: string | null
          obs?: string | null
          provedor?: string
          sensei_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filiacoes_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filiacoes_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filiacoes_sensei_id_fkey"
            columns: ["sensei_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_atletas: {
        Row: {
          aceite_lgpd: boolean
          atleta_id: string | null
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
          atleta_id?: string | null
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
          atleta_id?: string | null
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
            foreignKeyName: "leads_atletas_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "atletas"
            referencedColumns: ["id"]
          },
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
          adesao_asaas_id: string | null
          adesao_invoice_url: string | null
          adesao_paga: boolean
          anuidade_iniciada_em: string | null
          anuidade_status: string
          asaas_account_id: string | null
          asaas_status: string | null
          asaas_wallet_id: string | null
          cidade: string
          created_at: string | null
          data_adesao: string | null
          dia_aula: number | null
          dojo: string
          duracao_minutos: number
          email: string
          endereco: string | null
          foto_url: string | null
          fuso_horario: string
          graduacao: string | null
          horario_aula: string | null
          id: string
          instagram: string | null
          latitude: number | null
          link_afiliado_avulso: string | null
          link_afiliado_mensal: string | null
          link_publico_ativo: boolean | null
          longitude: number | null
          mensalidade_centavos: number | null
          nome: string
          obs: string | null
          onboarding_concluido: boolean
          pais: string
          piloto: boolean
          raio_metros: number
          recebedor_status: string
          selo_status: string
          slug: string
          status: string
          tempo_ensino: string | null
          tipo_licenca: string
          uf: string
          whatsapp: string
        }
        Insert: {
          adesao_asaas_id?: string | null
          adesao_invoice_url?: string | null
          adesao_paga?: boolean
          anuidade_iniciada_em?: string | null
          anuidade_status?: string
          asaas_account_id?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          cidade: string
          created_at?: string | null
          data_adesao?: string | null
          dia_aula?: number | null
          dojo: string
          duracao_minutos?: number
          email: string
          endereco?: string | null
          foto_url?: string | null
          fuso_horario?: string
          graduacao?: string | null
          horario_aula?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          link_afiliado_avulso?: string | null
          link_afiliado_mensal?: string | null
          link_publico_ativo?: boolean | null
          longitude?: number | null
          mensalidade_centavos?: number | null
          nome: string
          obs?: string | null
          onboarding_concluido?: boolean
          pais?: string
          piloto?: boolean
          raio_metros?: number
          recebedor_status?: string
          selo_status?: string
          slug: string
          status?: string
          tempo_ensino?: string | null
          tipo_licenca?: string
          uf: string
          whatsapp: string
        }
        Update: {
          adesao_asaas_id?: string | null
          adesao_invoice_url?: string | null
          adesao_paga?: boolean
          anuidade_iniciada_em?: string | null
          anuidade_status?: string
          asaas_account_id?: string | null
          asaas_status?: string | null
          asaas_wallet_id?: string | null
          cidade?: string
          created_at?: string | null
          data_adesao?: string | null
          dia_aula?: number | null
          dojo?: string
          duracao_minutos?: number
          email?: string
          endereco?: string | null
          foto_url?: string | null
          fuso_horario?: string
          graduacao?: string | null
          horario_aula?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          link_afiliado_avulso?: string | null
          link_afiliado_mensal?: string | null
          link_publico_ativo?: boolean | null
          longitude?: number | null
          mensalidade_centavos?: number | null
          nome?: string
          obs?: string | null
          onboarding_concluido?: boolean
          pais?: string
          piloto?: boolean
          raio_metros?: number
          recebedor_status?: string
          selo_status?: string
          slug?: string
          status?: string
          tempo_ensino?: string | null
          tipo_licenca?: string
          uf?: string
          whatsapp?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativa: boolean
          clube_id: string
          created_at: string
          dia_aula: number | null
          duracao_minutos: number
          endereco: string | null
          fuso_horario: string
          horario_aula: string | null
          id: string
          instrutor_id: string | null
          is_sede: boolean
          latitude: number | null
          longitude: number | null
          nome: string
          raio_metros: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          clube_id: string
          created_at?: string
          dia_aula?: number | null
          duracao_minutos?: number
          endereco?: string | null
          fuso_horario?: string
          horario_aula?: string | null
          id?: string
          instrutor_id?: string | null
          is_sede?: boolean
          latitude?: number | null
          longitude?: number | null
          nome: string
          raio_metros?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          clube_id?: string
          created_at?: string
          dia_aula?: number | null
          duracao_minutos?: number
          endereco?: string | null
          fuso_horario?: string
          horario_aula?: string | null
          id?: string
          instrutor_id?: string | null
          is_sede?: boolean
          latitude?: number | null
          longitude?: number | null
          nome?: string
          raio_metros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "senseis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "senseis_publicos"
            referencedColumns: ["id"]
          },
        ]
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
      slugificar: { Args: { txt: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "sensei" | "atleta"
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
      app_role: ["admin", "sensei", "atleta"],
    },
  },
} as const
