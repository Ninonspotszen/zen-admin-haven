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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      abonnes_b2c: {
        Row: {
          code_parrainage: string | null
          created_at: string | null
          date_fin_acces: string | null
          date_renouvellement: string | null
          email: string
          formule: string | null
          id: string
          langue_preferee: string | null
          note_interne: string | null
          parrain_id: string | null
          prenom: string | null
          spot_origine_id: string | null
          statut: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          code_parrainage?: string | null
          created_at?: string | null
          date_fin_acces?: string | null
          date_renouvellement?: string | null
          email: string
          formule?: string | null
          id: string
          langue_preferee?: string | null
          note_interne?: string | null
          parrain_id?: string | null
          prenom?: string | null
          spot_origine_id?: string | null
          statut?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          code_parrainage?: string | null
          created_at?: string | null
          date_fin_acces?: string | null
          date_renouvellement?: string | null
          email?: string
          formule?: string | null
          id?: string
          langue_preferee?: string | null
          note_interne?: string | null
          parrain_id?: string | null
          prenom?: string | null
          spot_origine_id?: string | null
          statut?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abonnes_b2c_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "abonnes_b2c"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnes_b2c_spot_origine_id_fkey"
            columns: ["spot_origine_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      acces_spots: {
        Row: {
          duree_acces_jours: number | null
          id: string
          premiere_visite: string | null
          spot_id: string | null
          uuid_visiteur: string
        }
        Insert: {
          duree_acces_jours?: number | null
          id?: string
          premiere_visite?: string | null
          spot_id?: string | null
          uuid_visiteur: string
        }
        Update: {
          duree_acces_jours?: number | null
          id?: string
          premiere_visite?: string | null
          spot_id?: string | null
          uuid_visiteur?: string
        }
        Relationships: [
          {
            foreignKeyName: "acces_spots_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_filtres: {
        Row: {
          audio_id: string | null
          filtre_id: string | null
          id: string
          valeur: string
        }
        Insert: {
          audio_id?: string | null
          filtre_id?: string | null
          id?: string
          valeur: string
        }
        Update: {
          audio_id?: string | null
          filtre_id?: string | null
          id?: string
          valeur?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_filtres_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_filtres_filtre_id_fkey"
            columns: ["filtre_id"]
            isOneToOne: false
            referencedRelation: "filtres"
            referencedColumns: ["id"]
          },
        ]
      }
      audios: {
        Row: {
          created_at: string | null
          duree_secondes: number | null
          groupe_slug: string | null
          id: string
          image_url: string | null
          moment: string | null
          musique_suite_id: string | null
          note_production: string | null
          ordre: number | null
          public_cible: string | null
          reference_interne: string | null
          slug: string | null
          statut: string | null
          titre_fr: string | null
          type: string | null
          voix: string | null
        }
        Insert: {
          created_at?: string | null
          duree_secondes?: number | null
          groupe_slug?: string | null
          id?: string
          image_url?: string | null
          moment?: string | null
          musique_suite_id?: string | null
          note_production?: string | null
          ordre?: number | null
          public_cible?: string | null
          reference_interne?: string | null
          slug?: string | null
          statut?: string | null
          titre_fr?: string | null
          type?: string | null
          voix?: string | null
        }
        Update: {
          created_at?: string | null
          duree_secondes?: number | null
          groupe_slug?: string | null
          id?: string
          image_url?: string | null
          moment?: string | null
          musique_suite_id?: string | null
          note_production?: string | null
          ordre?: number | null
          public_cible?: string | null
          reference_interne?: string | null
          slug?: string | null
          statut?: string | null
          titre_fr?: string | null
          type?: string | null
          voix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audios_musique_suite_fk"
            columns: ["musique_suite_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
        ]
      }
      audios_traductions: {
        Row: {
          audio_id: string | null
          cloudinary_url: string | null
          created_at: string | null
          description: string | null
          id: string
          langue: string
          titre: string
          voix: string | null
        }
        Insert: {
          audio_id?: string | null
          cloudinary_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          langue: string
          titre: string
          voix?: string | null
        }
        Update: {
          audio_id?: string | null
          cloudinary_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          langue?: string
          titre?: string
          voix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audios_traductions_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
        ]
      }
      client_audios: {
        Row: {
          audio_id: string | null
          client_id: string | null
          id: string
          priorite: number | null
          visible: boolean | null
        }
        Insert: {
          audio_id?: string | null
          client_id?: string | null
          id?: string
          priorite?: number | null
          visible?: boolean | null
        }
        Update: {
          audio_id?: string | null
          client_id?: string | null
          id?: string
          priorite?: number | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_audios_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_audios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          couleur_primaire: string | null
          created_at: string | null
          date_debut: string | null
          date_debut_acces: string | null
          date_pilote_fin: string | null
          date_renouvellement: string | null
          domaine_email: string | null
          duree_acces_jours: number | null
          emails_autorises: string[] | null
          frequence_facturation: string | null
          id: string
          langue_preferee: string | null
          logo_url: string | null
          mode_acces: string
          mois_offerts: number | null
          montant: number | null
          nom: string
          note_interne: string | null
          pack_souscrit: string | null
          shortio_slug: string | null
          statut: string | null
          statut_paiement: string | null
          type: string | null
        }
        Insert: {
          couleur_primaire?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_debut_acces?: string | null
          date_pilote_fin?: string | null
          date_renouvellement?: string | null
          domaine_email?: string | null
          duree_acces_jours?: number | null
          emails_autorises?: string[] | null
          frequence_facturation?: string | null
          id?: string
          langue_preferee?: string | null
          logo_url?: string | null
          mode_acces?: string
          mois_offerts?: number | null
          montant?: number | null
          nom: string
          note_interne?: string | null
          pack_souscrit?: string | null
          shortio_slug?: string | null
          statut?: string | null
          statut_paiement?: string | null
          type?: string | null
        }
        Update: {
          couleur_primaire?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_debut_acces?: string | null
          date_pilote_fin?: string | null
          date_renouvellement?: string | null
          domaine_email?: string | null
          duree_acces_jours?: number | null
          emails_autorises?: string[] | null
          frequence_facturation?: string | null
          id?: string
          langue_preferee?: string | null
          logo_url?: string | null
          mode_acces?: string
          mois_offerts?: number | null
          montant?: number | null
          nom?: string
          note_interne?: string | null
          pack_souscrit?: string | null
          shortio_slug?: string | null
          statut?: string | null
          statut_paiement?: string | null
          type?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string
          email: string | null
          etablissement: string | null
          id: string
          message: string | null
          nom: string | null
          secteur: string
          taille: string | null
          type_structure: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          etablissement?: string | null
          id?: string
          message?: string | null
          nom?: string | null
          secteur: string
          taille?: string | null
          type_structure?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          etablissement?: string | null
          id?: string
          message?: string | null
          nom?: string | null
          secteur?: string
          taille?: string | null
          type_structure?: string | null
        }
        Relationships: []
      }
      ecoutes: {
        Row: {
          audio_id: string | null
          duree_ecoute_sec: number | null
          id: string
          langue: string | null
          spot_id: string | null
          timestamp: string | null
          user_id: string | null
          voix: string | null
        }
        Insert: {
          audio_id?: string | null
          duree_ecoute_sec?: number | null
          id?: string
          langue?: string | null
          spot_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          voix?: string | null
        }
        Update: {
          audio_id?: string | null
          duree_ecoute_sec?: number | null
          id?: string
          langue?: string | null
          spot_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          voix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecoutes_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecoutes_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      filtres: {
        Row: {
          id: string
          nom: string
          valeurs_possibles: string[] | null
        }
        Insert: {
          id?: string
          nom: string
          valeurs_possibles?: string[] | null
        }
        Update: {
          id?: string
          nom?: string
          valeurs_possibles?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      spot_audios: {
        Row: {
          actif: boolean
          audio_id: string | null
          client_id: string | null
          id: string
          mis_en_avant: boolean | null
          mis_en_avant_moment: string | null
          ordre: number | null
          spot_id: string | null
        }
        Insert: {
          actif?: boolean
          audio_id?: string | null
          client_id?: string | null
          id?: string
          mis_en_avant?: boolean | null
          mis_en_avant_moment?: string | null
          ordre?: number | null
          spot_id?: string | null
        }
        Update: {
          actif?: boolean
          audio_id?: string | null
          client_id?: string | null
          id?: string
          mis_en_avant?: boolean | null
          mis_en_avant_moment?: string | null
          ordre?: number | null
          spot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_audios_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_audios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_audios_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          adresse: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nom: string | null
          note_interne: string | null
          photo_url: string | null
          pin_code: string | null
          shortio_url: string | null
          slug: string | null
          statut: string | null
        }
        Insert: {
          adresse?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string | null
          note_interne?: string | null
          photo_url?: string | null
          pin_code?: string | null
          shortio_url?: string | null
          slug?: string | null
          statut?: string | null
        }
        Update: {
          adresse?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string | null
          note_interne?: string | null
          photo_url?: string | null
          pin_code?: string | null
          shortio_url?: string | null
          slug?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_spot_email_domain: {
        Args: { p_email: string; p_id: string }
        Returns: boolean
      }
      get_audio_public: { Args: { p_audio: string }; Returns: Json }
      get_library_catalog: { Args: never; Returns: Json }
      get_public_titles: {
        Args: { p_audio_ids: string[] }
        Returns: {
          audio_id: string
          langue: string
          titre: string
        }[]
      }
      get_spot_catalog: { Args: { p_id: string; p_pin: string }; Returns: Json }
      get_spot_public: {
        Args: { p_id: string }
        Returns: {
          adresse: string
          client_nom: string
          description: string
          domaine_email: string
          duree_acces_jours: number
          id: string
          mode_acces: string
          nom: string
          photo_url: string
          pin_requis: boolean
          statut: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      register_spot_visit: {
        Args: { p_id: string; p_visitor: string }
        Returns: Json
      }
      spot_email_ok: { Args: { p_id: string }; Returns: boolean }
      verify_spot_pin: {
        Args: { p_id: string; p_pin: string }
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
