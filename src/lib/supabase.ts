import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          role: 'super_admin' | 'admin';
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          role?: 'super_admin' | 'admin';
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          role?: 'super_admin' | 'admin';
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          logo_url: string | null;
          banner_url: string | null;
          description: string | null;
          price: number;
          discount_percent: number;
          final_price: number;
          stock: number;
          requires_server: boolean;
          sort_order: number;
          is_active: boolean;
          is_popular: boolean;
          seo_title: string | null;
          meta_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          slug: string;
          logo_url?: string | null;
          banner_url?: string | null;
          description?: string | null;
          price: number;
          discount_percent?: number;
          stock?: number;
          requires_server?: boolean;
          sort_order?: number;
          is_active?: boolean;
          is_popular?: boolean;
          seo_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          description?: string | null;
          price?: number;
          discount_percent?: number;
          stock?: number;
          requires_server?: boolean;
          sort_order?: number;
          is_active?: boolean;
          is_popular?: boolean;
          seo_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      banners: {
        Row: {
          id: string;
          title: string;
          image_url: string;
          link_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          image_url: string;
          link_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          image_url?: string;
          link_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vouchers: {
        Row: {
          id: string;
          code: string;
          discount_type: 'percent' | 'fixed';
          discount_value: number;
          min_purchase: number;
          max_discount: number | null;
          usage_limit: number;
          used_count: number;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: 'percent' | 'fixed';
          discount_value: number;
          min_purchase?: number;
          max_discount?: number | null;
          usage_limit?: number;
          used_count?: number;
          valid_from: string;
          valid_until: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: 'percent' | 'fixed';
          discount_value?: number;
          min_purchase?: number;
          max_discount?: number | null;
          usage_limit?: number;
          used_count?: number;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          invoice_number: string;
          uid: string;
          server: string | null;
          whatsapp: string;
          email: string | null;
          status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status: 'unpaid' | 'waiting_payment' | 'paid' | 'expired' | 'failed';
          subtotal: number;
          discount: number;
          total: number;
          voucher_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          uid: string;
          server?: string | null;
          whatsapp: string;
          email?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status?: 'unpaid' | 'waiting_payment' | 'paid' | 'expired' | 'failed';
          subtotal: number;
          discount?: number;
          total: number;
          voucher_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          uid?: string;
          server?: string | null;
          whatsapp?: string;
          email?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
          payment_status?: 'unpaid' | 'waiting_payment' | 'paid' | 'expired' | 'failed';
          subtotal?: number;
          discount?: number;
          total?: number;
          voucher_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity?: number;
          price: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          price?: number;
          total?: number;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          payment_method: string;
          amount: number;
          status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
          qris_string: string | null;
          qr_code_url: string | null;
          reference_id: string | null;
          expired_at: string | null;
          paid_at: string | null;
          webhook_received_at: string | null;
          raw_response: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_method?: string;
          amount: number;
          status?: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
          qris_string?: string | null;
          qr_code_url?: string | null;
          reference_id?: string | null;
          expired_at?: string | null;
          paid_at?: string | null;
          webhook_received_at?: string | null;
          raw_response?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          payment_method?: string;
          amount?: number;
          status?: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
          qris_string?: string | null;
          qr_code_url?: string | null;
          reference_id?: string | null;
          expired_at?: string | null;
          paid_at?: string | null;
          webhook_received_at?: string | null;
          raw_response?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string | null;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value?: string | null;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string | null;
          description?: string | null;
          updated_at?: string;
        };
      };
      testimonials: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          content: string;
          rating: number | null;
          game: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          avatar_url?: string | null;
          content: string;
          rating?: number | null;
          game?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          content?: string;
          rating?: number | null;
          game?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      faq: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Banner = Database['public']['Tables']['banners']['Row'];
export type Voucher = Database['public']['Tables']['vouchers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Setting = Database['public']['Tables']['settings']['Row'];
export type Testimonial = Database['public']['Tables']['testimonials']['Row'];
export type FAQ = Database['public']['Tables']['faq']['Row'];
export type Admin = Database['public']['Tables']['admins']['Row'];
