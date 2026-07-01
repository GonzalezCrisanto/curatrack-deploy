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
      cart_items: {
        Row: {
          created_at: string
          curation_date: string | null
          id: string
          notes: string | null
          priority: string
          product_id: string
          quantity: number
          related_case_id: string | null
          related_evolution_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curation_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          product_id: string
          quantity?: number
          related_case_id?: string | null
          related_evolution_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curation_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          product_id?: string
          quantity?: number
          related_case_id?: string | null
          related_evolution_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "lab_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_related_case_id_fkey"
            columns: ["related_case_id"]
            isOneToOne: false
            referencedRelation: "wound_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_related_evolution_id_fkey"
            columns: ["related_evolution_id"]
            isOneToOne: false
            referencedRelation: "evolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_signatures: {
        Row: {
          case_id: string
          created_at: string
          evolution_id: string
          id: string
          patient_id: string
          professional_confirmation: boolean
          professional_signature_url: string | null
          professional_signed_at: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          evolution_id: string
          id?: string
          patient_id: string
          professional_confirmation?: boolean
          professional_signature_url?: string | null
          professional_signed_at?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          evolution_id?: string
          id?: string
          patient_id?: string
          professional_confirmation?: boolean
          professional_signature_url?: string | null
          professional_signed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_signatures_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "wound_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_signatures_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "evolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_signatures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      evolutions: {
        Row: {
          body_temperature: number | null
          case_id: string
          closed_at: string | null
          created_at: string
          description: string | null
          edge_types: string[] | null
          evolution_date: string
          evolution_status: string | null
          evolution_time: string | null
          exudate_amount: string | null
          exudate_color: string | null
          exudate_type: string | null
          has_infection_signs: boolean | null
          id: string
          inf_fever: boolean | null
          inf_heat: boolean | null
          inf_odor: boolean | null
          inf_purulent: boolean | null
          inf_redness: boolean | null
          inf_swelling: boolean | null
          materials: string | null
          medical_order: string | null
          observations: string | null
          odor: string | null
          pain_level: number | null
          procedure: string | null
          professional: string | null
          requires_medical_order: boolean | null
          tissue_types: string[] | null
          updated_at: string
          user_id: string
          wound_depth: number | null
          wound_length: number | null
          wound_width: number | null
        }
        Insert: {
          body_temperature?: number | null
          case_id: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          edge_types?: string[] | null
          evolution_date: string
          evolution_status?: string | null
          evolution_time?: string | null
          exudate_amount?: string | null
          exudate_color?: string | null
          exudate_type?: string | null
          has_infection_signs?: boolean | null
          id?: string
          inf_fever?: boolean | null
          inf_heat?: boolean | null
          inf_odor?: boolean | null
          inf_purulent?: boolean | null
          inf_redness?: boolean | null
          inf_swelling?: boolean | null
          materials?: string | null
          medical_order?: string | null
          observations?: string | null
          odor?: string | null
          pain_level?: number | null
          procedure?: string | null
          professional?: string | null
          requires_medical_order?: boolean | null
          tissue_types?: string[] | null
          updated_at?: string
          user_id: string
          wound_depth?: number | null
          wound_length?: number | null
          wound_width?: number | null
        }
        Update: {
          body_temperature?: number | null
          case_id?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          edge_types?: string[] | null
          evolution_date?: string
          evolution_status?: string | null
          evolution_time?: string | null
          exudate_amount?: string | null
          exudate_color?: string | null
          exudate_type?: string | null
          has_infection_signs?: boolean | null
          id?: string
          inf_fever?: boolean | null
          inf_heat?: boolean | null
          inf_odor?: boolean | null
          inf_purulent?: boolean | null
          inf_redness?: boolean | null
          inf_swelling?: boolean | null
          materials?: string | null
          medical_order?: string | null
          observations?: string | null
          odor?: string | null
          pain_level?: number | null
          procedure?: string | null
          professional?: string | null
          requires_medical_order?: boolean | null
          tissue_types?: string[] | null
          updated_at?: string
          user_id?: string
          wound_depth?: number | null
          wound_length?: number | null
          wound_width?: number | null
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
      lab_products: {
        Row: {
          category_id: string | null
          clinical_tags: string[]
          created_at: string
          currency: string
          datasheet_url: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          lab_id: string
          min_stock: number | null
          name: string
          presentation: string | null
          price: number | null
          price_updated_at: string
          price_valid_until: string | null
          short_description: string | null
          size: string | null
          sku: string | null
          stock: number | null
          stock_updated_at: string
          units_per_box: number | null
          updated_at: string
          usage_instructions: string | null
          wound_types: string[]
        }
        Insert: {
          category_id?: string | null
          clinical_tags?: string[]
          created_at?: string
          currency?: string
          datasheet_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          lab_id: string
          min_stock?: number | null
          name: string
          presentation?: string | null
          price?: number | null
          price_updated_at?: string
          price_valid_until?: string | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          stock?: number | null
          stock_updated_at?: string
          units_per_box?: number | null
          updated_at?: string
          usage_instructions?: string | null
          wound_types?: string[]
        }
        Update: {
          category_id?: string | null
          clinical_tags?: string[]
          created_at?: string
          currency?: string
          datasheet_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          lab_id?: string
          min_stock?: number | null
          name?: string
          presentation?: string | null
          price?: number | null
          price_updated_at?: string
          price_valid_until?: string | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          stock?: number | null
          stock_updated_at?: string
          units_per_box?: number | null
          updated_at?: string
          usage_instructions?: string | null
          wound_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lab_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_products_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sellers: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          lab_id: string
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          lab_id: string
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          lab_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_sellers_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      patient_consents: {
        Row: {
          accepts_clinical_photos: boolean
          accepts_digital_record: boolean
          accepts_digital_reports: boolean
          accepts_wound_tracking: boolean
          consent_version: string
          created_at: string
          id: string
          patient_id: string
          signature_url: string | null
          signed_at: string | null
          signer_dni: string | null
          signer_full_name: string | null
          signer_relationship: string | null
          signer_relationship_other: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepts_clinical_photos?: boolean
          accepts_digital_record?: boolean
          accepts_digital_reports?: boolean
          accepts_wound_tracking?: boolean
          consent_version?: string
          created_at?: string
          id?: string
          patient_id: string
          signature_url?: string | null
          signed_at?: string | null
          signer_dni?: string | null
          signer_full_name?: string | null
          signer_relationship?: string | null
          signer_relationship_other?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepts_clinical_photos?: boolean
          accepts_digital_record?: boolean
          accepts_digital_reports?: boolean
          accepts_wound_tracking?: boolean
          consent_version?: string
          created_at?: string
          id?: string
          patient_id?: string
          signature_url?: string | null
          signed_at?: string | null
          signer_dni?: string | null
          signer_full_name?: string | null
          signer_relationship?: string | null
          signer_relationship_other?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          admission_date: string | null
          age: number | null
          allergies: string | null
          assigned_professional: string | null
          birth_date: string | null
          created_at: string
          diagnosis: string | null
          dni: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          insurance: string | null
          last_name: string
          observations: string | null
          phone: string | null
          treating_doctor_name: string | null
          treating_doctor_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          age?: number | null
          allergies?: string | null
          assigned_professional?: string | null
          birth_date?: string | null
          created_at?: string
          diagnosis?: string | null
          dni?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance?: string | null
          last_name: string
          observations?: string | null
          phone?: string | null
          treating_doctor_name?: string | null
          treating_doctor_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          age?: number | null
          allergies?: string | null
          assigned_professional?: string | null
          birth_date?: string | null
          created_at?: string
          diagnosis?: string | null
          dni?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance?: string | null
          last_name?: string
          observations?: string | null
          phone?: string | null
          treating_doctor_name?: string | null
          treating_doctor_phone?: string | null
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
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_clinical_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_interactions: {
        Row: {
          context: string | null
          created_at: string
          id: string
          interaction_type: string
          product_id: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          product_id: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_interactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "lab_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendation_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          match_clinical_tag: string | null
          match_exudate: string | null
          match_infection: boolean | null
          match_wound_type: string | null
          priority: number
          recommended_category_slug: string | null
          recommended_clinical_tag: string | null
          rule_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_clinical_tag?: string | null
          match_exudate?: string | null
          match_infection?: boolean | null
          match_wound_type?: string | null
          priority?: number
          recommended_category_slug?: string | null
          recommended_clinical_tag?: string | null
          rule_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_clinical_tag?: string | null
          match_exudate?: string | null
          match_infection?: boolean | null
          match_wound_type?: string | null
          priority?: number
          recommended_category_slug?: string | null
          recommended_clinical_tag?: string | null
          rule_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          institution: string | null
          last_name: string
          license: string | null
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_assignments: {
        Row: {
          created_at: string
          id: string
          institution: string | null
          is_active: boolean
          lab_id: string
          seller_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          lab_id: string
          seller_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          lab_id?: string
          seller_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_assignments_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "lab_sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "lab_sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          accent_color: string
          app_name: string
          billing_details: string | null
          catalog_name: string
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          lab_id: string | null
          legal_footer: string | null
          logo_url: string | null
          powered_by_label: string | null
          primary_color: string
          responsible_person: string | null
          sales_contact_label: string | null
          secondary_color: string
          slug: string
          sponsor_label: string
          sponsor_name: string
          support_email: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          app_name: string
          billing_details?: string | null
          catalog_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id?: string | null
          legal_footer?: string | null
          logo_url?: string | null
          powered_by_label?: string | null
          primary_color?: string
          responsible_person?: string | null
          sales_contact_label?: string | null
          secondary_color?: string
          slug: string
          sponsor_label?: string
          sponsor_name: string
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          app_name?: string
          billing_details?: string | null
          catalog_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id?: string | null
          legal_footer?: string | null
          logo_url?: string | null
          powered_by_label?: string | null
          primary_color?: string
          responsible_person?: string | null
          sales_contact_label?: string | null
          secondary_color?: string
          slug?: string
          sponsor_label?: string
          sponsor_name?: string
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          order_id: string
          presentation: string | null
          priority: string | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          subtotal: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id: string
          presentation?: string | null
          priority?: string | null
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          subtotal?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id?: string
          presentation?: string | null
          priority?: string | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          subtotal?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supply_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "lab_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_orders: {
        Row: {
          channel: string | null
          clinical_recommendation: string | null
          commercial_notes: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_notes: string | null
          delivery_postal_code: string | null
          estimated_total: number | null
          general_wound_type: string | null
          id: string
          institution: string | null
          lab_id: string | null
          order_number: string
          professional_name: string | null
          seller_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          clinical_recommendation?: string | null
          commercial_notes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          estimated_total?: number | null
          general_wound_type?: string | null
          id?: string
          institution?: string | null
          lab_id?: string | null
          order_number?: string
          professional_name?: string | null
          seller_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          clinical_recommendation?: string | null
          commercial_notes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          estimated_total?: number | null
          general_wound_type?: string | null
          id?: string
          institution?: string | null
          lab_id?: string | null
          order_number?: string
          professional_name?: string | null
          seller_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_orders_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "lab_sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "lab_sellers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "wound_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lab_sponsors: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          is_active: boolean
          lab_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lab_sponsors_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_sponsor: {
        Row: {
          created_at: string
          sponsor_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sponsor_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          sponsor_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sponsor_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      wound_cases: {
        Row: {
          ai_summary: string | null
          ai_summary_updated_at: string | null
          anatomical_location: string | null
          created_at: string
          id: string
          patient_id: string
          start_date: string | null
          status: string
          treatment: string | null
          updated_at: string
          user_id: string
          wound_type: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          anatomical_location?: string | null
          created_at?: string
          id?: string
          patient_id: string
          start_date?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
          user_id: string
          wound_type: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          anatomical_location?: string | null
          created_at?: string
          id?: string
          patient_id?: string
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
      lab_sellers_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          lab_id: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          lab_id?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          lab_id?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_sellers_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      get_sponsor_order_items_anon: {
        Args: { p_order_ids?: string[] }
        Returns: {
          currency: string
          id: string
          order_id: string
          presentation: string
          product_id: string
          product_name: string
          product_sku: string
          quantity: number
          subtotal: number
          unit_price: number
        }[]
      }
      get_sponsor_orders_anon: {
        Args: { p_period_days?: number }
        Returns: {
          anonymized_case_code: string
          channel: string
          created_at: string
          currency: string
          estimated_total: number
          general_wound_type: string
          id: string
          institution: string
          order_number: string
          sent_at: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professional" | "sponsor"
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
      app_role: ["admin", "professional", "sponsor"],
    },
  },
} as const
