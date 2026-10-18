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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_state: {
        Row: {
          phase: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          phase?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          phase?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          breeder_visible: boolean
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          commercial_notes: string | null
          commercial_status: string | null
          consultations: Json | null
          couleur: string | null
          created_at: string
          deposit_received: boolean | null
          gallery_photos: Json
          id: string
          litter_id: string | null
          mother_id: string | null
          naissance: string | null
          nom: string
          paradis: boolean
          particularite: string | null
          photo: string | null
          planned_departure_date: string | null
          poids: Json | null
          puce: string | null
          race: string | null
          repas: Json | null
          robe: string | null
          sexe: string
          soins: Json | null
          sterilise: boolean | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          breeder_visible?: boolean
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          commercial_notes?: string | null
          commercial_status?: string | null
          consultations?: Json | null
          couleur?: string | null
          created_at?: string
          deposit_received?: boolean | null
          gallery_photos?: Json
          id?: string
          litter_id?: string | null
          mother_id?: string | null
          naissance?: string | null
          nom: string
          paradis?: boolean
          particularite?: string | null
          photo?: string | null
          planned_departure_date?: string | null
          poids?: Json | null
          puce?: string | null
          race?: string | null
          repas?: Json | null
          robe?: string | null
          sexe: string
          soins?: Json | null
          sterilise?: boolean | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          breeder_visible?: boolean
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          commercial_notes?: string | null
          commercial_status?: string | null
          consultations?: Json | null
          couleur?: string | null
          created_at?: string
          deposit_received?: boolean | null
          gallery_photos?: Json
          id?: string
          litter_id?: string | null
          mother_id?: string | null
          naissance?: string | null
          nom?: string
          paradis?: boolean
          particularite?: string | null
          photo?: string | null
          planned_departure_date?: string | null
          poids?: Json | null
          puce?: string | null
          race?: string | null
          repas?: Json | null
          robe?: string | null
          sexe?: string
          soins?: Json | null
          sterilise?: boolean | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      breeder_profiles: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          nom: string | null
          nom_elevage: string | null
          prenom: string | null
          signature_url: string | null
          siret: string | null
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          nom?: string | null
          nom_elevage?: string | null
          prenom?: string | null
          signature_url?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          nom?: string | null
          nom_elevage?: string | null
          prenom?: string | null
          signature_url?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          app_variant: string | null
          created_at: string
          current_screen: string | null
          device_info: Json | null
          id: string
          message: string
          screenshot_url: string | null
          steps_to_reproduce: string | null
          subject: string | null
          type: string
          user_id: string
        }
        Insert: {
          app_variant?: string | null
          created_at?: string
          current_screen?: string | null
          device_info?: Json | null
          id?: string
          message: string
          screenshot_url?: string | null
          steps_to_reproduce?: string | null
          subject?: string | null
          type?: string
          user_id: string
        }
        Update: {
          app_variant?: string | null
          created_at?: string
          current_screen?: string | null
          device_info?: Json | null
          id?: string
          message?: string
          screenshot_url?: string | null
          steps_to_reproduce?: string | null
          subject?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      heat_cycles: {
        Row: {
          animal_id: string
          created_at: string
          date_debut: string
          date_fin: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          date_debut: string
          date_fin?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heat_cycles_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      litters: {
        Row: {
          birth_date: string
          birth_time: string | null
          created_at: string
          father_id: string | null
          father_name: string | null
          id: string
          mother_id: string
          notes: string | null
          reproduction_id: string | null
          user_id: string
        }
        Insert: {
          birth_date: string
          birth_time?: string | null
          created_at?: string
          father_id?: string | null
          father_name?: string | null
          id?: string
          mother_id: string
          notes?: string | null
          reproduction_id?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string
          birth_time?: string | null
          created_at?: string
          father_id?: string | null
          father_name?: string | null
          id?: string
          mother_id?: string
          notes?: string | null
          reproduction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "litters_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_reproduction_id_fkey"
            columns: ["reproduction_id"]
            isOneToOne: false
            referencedRelation: "reproductions"
            referencedColumns: ["id"]
          },
        ]
      }
      media_cleanup_jobs: {
        Row: {
          bucket: string
          completed: boolean
          media_id: string
          object_path: string
          user_id: string
        }
        Insert: {
          bucket: string
          completed?: boolean
          media_id: string
          object_path: string
          user_id: string
        }
        Update: {
          bucket?: string
          completed?: boolean
          media_id?: string
          object_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_cleanup_jobs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "trusted_media"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          animal_id: string | null
          created_at: string
          days_before: number
          description: string | null
          due_date: string
          id: string
          read: boolean
          soin_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          days_before?: number
          description?: string | null
          due_date: string
          id?: string
          read?: boolean
          soin_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          days_before?: number
          description?: string | null
          due_date?: string
          id?: string
          read?: boolean
          soin_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_items: {
        Row: {
          category: string | null
          created_at: string
          expiration_date: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          notes: string | null
          quantity_remaining: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          notes?: string | null
          quantity_remaining?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          notes?: string | null
          quantity_remaining?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rendezvous: {
        Row: {
          animal_ids: string[] | null
          created_at: string
          date: string
          heure: string | null
          id: string
          notes: string | null
          objet: string
          user_id: string
        }
        Insert: {
          animal_ids?: string[] | null
          created_at?: string
          date: string
          heure?: string | null
          id?: string
          notes?: string | null
          objet: string
          user_id: string
        }
        Update: {
          animal_ids?: string[] | null
          created_at?: string
          date?: string
          heure?: string | null
          id?: string
          notes?: string | null
          objet?: string
          user_id?: string
        }
        Relationships: []
      }
      reproductions: {
        Row: {
          animal_id: string
          confirmed: boolean
          created_at: string
          date_saillie: string
          father_animal_id: string | null
          father_external_name: string | null
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          animal_id: string
          confirmed?: boolean
          created_at?: string
          date_saillie: string
          father_animal_id?: string | null
          father_external_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          animal_id?: string
          confirmed?: boolean
          created_at?: string
          date_saillie?: string
          father_animal_id?: string | null
          father_external_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reproductions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reproductions_father_animal_id_fkey"
            columns: ["father_animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      security_release_state: {
        Row: {
          deletion_enabled: boolean
          id: boolean
          test_users: string[]
          transfers_enabled: boolean
        }
        Insert: {
          deletion_enabled?: boolean
          id?: boolean
          test_users?: string[]
          transfers_enabled?: boolean
        }
        Update: {
          deletion_enabled?: boolean
          id?: boolean
          test_users?: string[]
          transfers_enabled?: boolean
        }
        Relationships: []
      }
      transfer_archive: {
        Row: {
          animal_data: Json
          animal_id: string
          animal_name: string
          animal_photo: string | null
          id: string
          original_owner_id: string
          transfer_code_id: string | null
          transferred_at: string
        }
        Insert: {
          animal_data?: Json
          animal_id: string
          animal_name: string
          animal_photo?: string | null
          id?: string
          original_owner_id: string
          transfer_code_id?: string | null
          transferred_at?: string
        }
        Update: {
          animal_data?: Json
          animal_id?: string
          animal_name?: string
          animal_photo?: string | null
          id?: string
          original_owner_id?: string
          transfer_code_id?: string | null
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_archive_transfer_code_id_fkey"
            columns: ["transfer_code_id"]
            isOneToOne: false
            referencedRelation: "transfer_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_attempt_windows: {
        Row: {
          action: string
          attempts: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          attempts?: number
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          attempts?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      transfer_codes: {
        Row: {
          animal_id: string
          claimed_at: string | null
          code: string
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          secret_hash: string | null
          to_user_id: string | null
        }
        Insert: {
          animal_id: string
          claimed_at?: string | null
          code: string
          created_at?: string
          expires_at: string
          from_user_id: string
          id?: string
          secret_hash?: string | null
          to_user_id?: string | null
        }
        Update: {
          animal_id?: string
          claimed_at?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          secret_hash?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_codes_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_media: {
        Row: {
          bucket: string
          canonical_url: string
          custodian_id: string
          id: string
          object_path: string
          status: string
        }
        Insert: {
          bucket: string
          canonical_url: string
          custodian_id: string
          id?: string
          object_path: string
          status?: string
        }
        Update: {
          bucket?: string
          canonical_url?: string
          custodian_id?: string
          id?: string
          object_path?: string
          status?: string
        }
        Relationships: []
      }
      trusted_media_bindings: {
        Row: {
          entity_id: string
          entity_kind: string
          media_id: string
          owner_id: string
        }
        Insert: {
          entity_id: string
          entity_kind: string
          media_id: string
          owner_id: string
        }
        Update: {
          entity_id?: string
          entity_kind?: string
          media_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_media_bindings_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "trusted_media"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bind_trusted_media: {
        Args: {
          p_entity: string
          p_kind: string
          p_owner: string
          p_url: string
        }
        Returns: undefined
      }
      claim_transfer_code: { Args: { p_code: string }; Returns: string }
      complete_media_cleanup: {
        Args: { p_media: string; p_uid: string }
        Returns: undefined
      }
      consume_transfer_attempt: {
        Args: { p_action: string; p_uid: string }
        Returns: boolean
      }
      deletion_has_foreign_relationships: {
        Args: { p_uid: string }
        Returns: boolean
      }
      finalize_secure_account_deletion: {
        Args: { p_uid: string }
        Returns: undefined
      }
      prepare_account_cleanup: { Args: { p_uid: string }; Returns: Json }
      prepare_secure_account_deletion: {
        Args: { p_uid: string }
        Returns: Json
      }
      secure_claim_transfer: {
        Args: { p_code: string; p_uid: string }
        Returns: Json
      }
      secure_create_transfer: {
        Args: { p_animal: string; p_uid: string }
        Returns: Json
      }
      secure_list_transfers: {
        Args: { p_animal: string; p_uid: string }
        Returns: Json
      }
      security_account_active: { Args: { p_uid: string }; Returns: boolean }
      security_feature_allowed: {
        Args: { p_feature: string; p_uid: string }
        Returns: boolean
      }
      security_media_list_allowed: {
        Args: { p_bucket: string; p_path: string }
        Returns: boolean
      }
      security_mutation_lock: { Args: never; Returns: undefined }
      security_upload_allowed: {
        Args: { p_bucket: string; p_path: string }
        Returns: boolean
      }
      transfer_has_complex_relationships: {
        Args: { p_animal: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
