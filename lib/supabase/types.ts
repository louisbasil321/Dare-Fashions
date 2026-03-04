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
      basket_items: {
        Row: {
          basket_id: string
          id: string
          price_at_time: number
          product_id: string
          quantity: number
        }
        Insert: {
          basket_id: string
          id?: string
          price_at_time: number
          product_id: string
          quantity: number
        }
        Update: {
          basket_id?: string
          id?: string
          price_at_time?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "basket_items_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      baskets: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          guest_session_id: string | null
          id: string
          paid_at: string | null
          phone: string | null
          shipped_at: string | null
          state: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          guest_session_id?: string | null
          id?: string
          paid_at?: string | null
          phone?: string | null
          shipped_at?: string | null
          state?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          guest_session_id?: string | null
          id?: string
          paid_at?: string | null
          phone?: string | null
          shipped_at?: string | null
          state?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "baskets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          last_basket_id: string | null
          name: string | null
          phone: string | null
          role: string | null
          state: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_basket_id?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          state?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_basket_id?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_last_basket"
            columns: ["last_basket_id"]
            isOneToOne: false
            referencedRelation: "baskets"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          admin_whatsapp_number: string
          id: number
        }
        Insert: {
          admin_whatsapp_number: string
          id?: number
        }
        Update: {
          admin_whatsapp_number?: string
          id?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          price_at_time: number
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          video_url: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          price_at_time: number
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          video_url?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          price_at_time?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          guest_session_id: string | null
          id: string
          original_basket_id: string | null
          paid_at: string
          phone: string | null
          state: string | null
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          guest_session_id?: string | null
          id?: string
          original_basket_id?: string | null
          paid_at?: string
          phone?: string | null
          state?: string | null
          total: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          guest_session_id?: string | null
          id?: string
          original_basket_id?: string | null
          paid_at?: string
          phone?: string | null
          state?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_original_basket_id_fkey"
            columns: ["original_basket_id"]
            isOneToOne: false
            referencedRelation: "baskets"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: number
          created_at: string
          deleted: boolean
          description: string | null
          id: string
          image_url: string | null
          keywords: Json | null
          keywords_embedding: string | null
          name: string
          price: number
          sex: string
          stock: number
          video_url: string | null
        }
        Insert: {
          available?: number
          created_at?: string
          deleted?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          keywords?: Json | null
          keywords_embedding?: string | null
          name: string
          price: number
          sex?: string
          stock?: number
          video_url?: string | null
        }
        Update: {
          available?: number
          created_at?: string
          deleted?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          keywords?: Json | null
          keywords_embedding?: string | null
          name?: string
          price?: number
          sex?: string
          stock?: number
          video_url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consolidate_user_baskets: { Args: { p_user_id: string }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_basket_if_empty: {
        Args: { p_basket_id: string }
        Returns: boolean
      }
      delete_guest_basket: {
        Args: { p_guest_session_id: string }
        Returns: undefined
      }
      get_customers_with_email: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          role: string
          state: string
        }[]
      }
      get_guest_session_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      mark_baskets_paid: { Args: { basket_ids: string[] }; Returns: undefined }
      match_products: {
        Args: { match_threshold: number; query_embedding: string }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      merge_basket_items: {
        Args: { source_basket_id: string; target_basket_id: string }
        Returns: undefined
      }
      merge_guest_basket: {
        Args: { p_guest_session_id: string; p_user_id: string }
        Returns: string
      }
      merge_guest_baskets: {
        Args: { p_guest_session_id: string; p_user_id: string }
        Returns: undefined
      }
      merge_user_baskets: {
        Args: { p_guest_session_id: string; p_user_id: string }
        Returns: Json
      }
      search_products_by_trigram: {
        Args: { search_query: string; similarity_threshold?: number }
        Returns: {
          id: string
          similarity_score: number
        }[]
      }
      set_app_guest_session_id: {
        Args: { session_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
    Enums: {},
  },
} as const
