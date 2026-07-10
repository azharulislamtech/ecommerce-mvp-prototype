export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AdminRole = "owner" | "admin";

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          role: AdminRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          role?: AdminRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          role?: AdminRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          price: number;
          discount_price: number | null;
          stock_quantity: number;
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          price: number;
          discount_price?: number | null;
          stock_quantity?: number;
          is_active?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          price?: number;
          discount_price?: number | null;
          stock_quantity?: number;
          is_active?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      product_reviews: {
        Row: {
          id: string;
          product_id: string;
          order_id: string;
          rating: number;
          title: string | null;
          body: string;
          reviewer_label: string;
          verified_purchase: boolean;
          status: ReviewStatus;
          moderated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          order_id: string;
          rating: number;
          title?: string | null;
          body: string;
          reviewer_label?: string;
          verified_purchase?: boolean;
          status?: ReviewStatus;
          moderated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          order_id?: string;
          rating?: number;
          title?: string | null;
          body?: string;
          reviewer_label?: string;
          verified_purchase?: boolean;
          status?: ReviewStatus;
          moderated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          customer_phone: string;
          customer_district: string;
          customer_address: string;
          customer_note: string | null;
          subtotal: number;
          delivery_charge: number;
          discount_amount: number;
          total_amount: number;
          order_status: OrderStatus;
          payment_status: PaymentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_name: string;
          customer_phone: string;
          customer_district: string;
          customer_address: string;
          customer_note?: string | null;
          subtotal: number;
          delivery_charge?: number;
          discount_amount?: number;
          total_amount: number;
          order_status?: OrderStatus;
          payment_status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_name?: string;
          customer_phone?: string;
          customer_district?: string;
          customer_address?: string;
          customer_note?: string | null;
          subtotal?: number;
          delivery_charge?: number;
          discount_amount?: number;
          total_amount?: number;
          order_status?: OrderStatus;
          payment_status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          unit_price?: number;
          quantity?: number;
          total_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          gateway_name: string;
          gateway_transaction_id: string | null;
          amount: number;
          currency: string;
          payment_method: string | null;
          payment_status: PaymentStatus;
          gateway_response: Json | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          gateway_name: string;
          gateway_transaction_id?: string | null;
          amount: number;
          currency?: string;
          payment_method?: string | null;
          payment_status?: PaymentStatus;
          gateway_response?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          gateway_name?: string;
          gateway_transaction_id?: string | null;
          amount?: number;
          currency?: string;
          payment_method?: string | null;
          payment_status?: PaymentStatus;
          gateway_response?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          payment_id: string;
          event_type: string;
          event_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          event_type: string;
          event_payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          event_type?: string;
          event_payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_checkout_order: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_district: string;
          p_customer_address: string;
          p_customer_note: string | null;
          p_payment_method: string;
          p_items: Json;
        };
        Returns: {
          order_id: string;
          order_number: string;
          subtotal: number;
          delivery_charge: number;
          discount_amount: number;
          total_amount: number;
          payment_status: string;
          order_status: string;
        }[];
      };      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_product_review_summary: {
        Args: { p_product_id: string; };
        Returns: { review_count: number; average_rating: number | null; }[];
      };
      get_public_product_reviews: {
        Args: { p_product_id: string; };
        Returns: {
          id: string;
          rating: number;
          title: string | null;
          body: string;
          reviewer_label: string;
          verified_purchase: boolean;
          created_at: string;
        }[];
      };
      submit_verified_product_review: {
        Args: {
          p_product_id: string;
          p_order_number: string;
          p_customer_phone: string;
          p_rating: number;
          p_title: string | null;
          p_body: string;
        };
        Returns: { review_id: string; review_status: string; }[];
      };
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];




