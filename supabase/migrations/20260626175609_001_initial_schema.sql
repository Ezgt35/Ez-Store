/*
# Ez-Store Initial Database Schema

1. New Tables
- `admins` - Admin users with role-based access (super_admin, admin)
- `categories` - Product categories with icons and ordering
- `products` - Game top-up products with full details
- `banners` - Homepage promotional banners
- `vouchers` - Discount/promo codes with validity periods
- `orders` - Customer orders with UID, server, WhatsApp, email
- `order_items` - Individual items within an order
- `payments` - Payment tracking with QRIS integration
- `settings` - Website configuration (name, logo, SEO, etc.)
- `testimonials` - Customer reviews/testimonials
- `faq` - Frequently asked questions

2. Security
- RLS enabled on all tables
- Public read access for products, categories, banners, testimonials, faq, settings
- Admin-only write access for management tables
- Orders are readable by anyone (for invoice lookup), writable for public checkout
- Admin authentication handled via custom admin table with bcrypt passwords

3. Notes
- All tables use UUID primary keys
- Timestamps for created_at and updated_at
- Foreign key relationships maintained
- Indexes on frequently queried columns
*/

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  banner_url text,
  description text,
  price decimal(12,2) NOT NULL,
  discount_percent decimal(5,2) DEFAULT 0,
  final_price decimal(12,2) GENERATED ALWAYS AS (price * (1 - COALESCE(discount_percent, 0) / 100)) STORED,
  stock integer DEFAULT -1,
  requires_server boolean DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean DEFAULT false,
  seo_title text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value decimal(12,2) NOT NULL,
  min_purchase decimal(12,2) DEFAULT 0,
  max_discount decimal(12,2),
  usage_limit integer DEFAULT -1,
  used_count integer DEFAULT 0,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  uid text NOT NULL,
  server text,
  whatsapp text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'waiting_payment', 'paid', 'expired', 'failed')),
  subtotal decimal(12,2) NOT NULL,
  discount decimal(12,2) DEFAULT 0,
  total decimal(12,2) NOT NULL,
  voucher_id uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price decimal(12,2) NOT NULL,
  total decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'qris',
  amount decimal(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded')),
  qris_string text,
  qr_code_url text,
  reference_id text,
  expired_at timestamptz,
  paid_at timestamptz,
  webhook_received_at timestamptz,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  game text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- FAQ table
CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_popular ON products(is_popular) WHERE is_popular = true;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(sort_order);

-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- Categories: public read only
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (false);

-- Products: public read only
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (false);

-- Banners: public read only
DROP POLICY IF EXISTS "anon_read_banners" ON banners;
CREATE POLICY "anon_read_banners" ON banners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_banners" ON banners;
CREATE POLICY "anon_insert_banners" ON banners FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_banners" ON banners;
CREATE POLICY "anon_update_banners" ON banners FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_banners" ON banners;
CREATE POLICY "anon_delete_banners" ON banners FOR DELETE
  TO anon, authenticated USING (false);

-- Vouchers: public read only
DROP POLICY IF EXISTS "anon_read_vouchers" ON vouchers;
CREATE POLICY "anon_read_vouchers" ON vouchers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vouchers" ON vouchers;
CREATE POLICY "anon_insert_vouchers" ON vouchers FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_vouchers" ON vouchers;
CREATE POLICY "anon_update_vouchers" ON vouchers FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_vouchers" ON vouchers;
CREATE POLICY "anon_delete_vouchers" ON vouchers FOR DELETE
  TO anon, authenticated USING (false);

-- Orders: public read (for invoice lookup), no anonymous write
DROP POLICY IF EXISTS "anon_read_orders" ON orders;
CREATE POLICY "anon_read_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (false);

-- Order items: public read, no anonymous write
DROP POLICY IF EXISTS "anon_read_order_items" ON order_items;
CREATE POLICY "anon_read_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (false);

-- Payments: public read, no anonymous write
DROP POLICY IF EXISTS "anon_read_payments" ON payments;
CREATE POLICY "anon_read_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE
  TO anon, authenticated USING (false);

-- Settings: public read only
DROP POLICY IF EXISTS "anon_read_settings" ON settings;
CREATE POLICY "anon_read_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (false);

-- Testimonials: public read only
DROP POLICY IF EXISTS "anon_read_testimonials" ON testimonials;
CREATE POLICY "anon_read_testimonials" ON testimonials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_testimonials" ON testimonials;
CREATE POLICY "anon_insert_testimonials" ON testimonials FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_testimonials" ON testimonials;
CREATE POLICY "anon_update_testimonials" ON testimonials FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_testimonials" ON testimonials;
CREATE POLICY "anon_delete_testimonials" ON testimonials FOR DELETE
  TO anon, authenticated USING (false);

-- FAQ: public read only
DROP POLICY IF EXISTS "anon_read_faq" ON faq;
CREATE POLICY "anon_read_faq" ON faq FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_faq" ON faq;
CREATE POLICY "anon_insert_faq" ON faq FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_faq" ON faq;
CREATE POLICY "anon_update_faq" ON faq FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_faq" ON faq;
CREATE POLICY "anon_delete_faq" ON faq FOR DELETE
  TO anon, authenticated USING (false);

-- Admins: no public access, use backend auth function only
DROP POLICY IF EXISTS "anon_read_admins" ON admins;
CREATE POLICY "anon_read_admins" ON admins FOR SELECT
  TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "anon_insert_admins" ON admins;
CREATE POLICY "anon_insert_admins" ON admins FOR INSERT
  TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "anon_update_admins" ON admins;
CREATE POLICY "anon_update_admins" ON admins FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "anon_delete_admins" ON admins;
CREATE POLICY "anon_delete_admins" ON admins FOR DELETE
  TO anon, authenticated USING (false);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('site_name', 'Ez-Store', 'Website name'),
  ('site_tagline', 'Top Up Game Termurah & Tercepat', 'Website tagline'),
  ('logo_url', '', 'Site logo URL'),
  ('favicon_url', '', 'Favicon URL'),
  ('contact_email', 'support@ez-store.com', 'Contact email'),
  ('contact_whatsapp', '6281234567890', 'WhatsApp number'),
  ('facebook_url', '', 'Facebook page URL'),
  ('instagram_url', '', 'Instagram URL'),
  ('twitter_url', '', 'Twitter URL'),
  ('youtube_url', '', 'YouTube URL'),
  ('seo_title', 'Ez-Store - Top Up Game Termurah & Tercepat', 'Default SEO title'),
  ('meta_description', 'Top up game dengan harga termurah dan proses tercepat. Diamond, UC, ML, PUBG, Free Fire dan game lainnya.', 'Default meta description'),
  ('footer_text', '© 2024 Ez-Store. All rights reserved.', 'Footer copyright text'),
  ('google_analytics_id', '', 'Google Analytics tracking ID')
ON CONFLICT (key) DO NOTHING;

-- Insert default admin (password: admin123 - bcrypt hash)
-- Note: In production, this should be changed immediately
INSERT INTO admins (email, password_hash, name, role) VALUES
  ('admin@ez-store.com', '$2a$10$YourBcryptHashHereReplaceInProduction', 'Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Mobile Legends', 'mobile-legends', 'smartphone', 'Top up Diamond Mobile Legends', 1),
  ('PUBG Mobile', 'pubg-mobile', 'gamepad-2', 'Top up UC PUBG Mobile', 2),
  ('Free Fire', 'free-fire', 'flame', 'Top up Diamond Free Fire', 3),
  ('Genshin Impact', 'genshin-impact', 'sparkles', 'Top up Genesis Crystal', 4),
  ('Valorant', 'valorant', 'crosshair', 'Top up Valorant Points', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample FAQ
INSERT INTO faq (question, answer, sort_order) VALUES
  ('Bagaimana cara melakukan top up?', 'Pilih game yang ingin di top up, masukkan UID/ID akun, pilih nominal, lakukan pembayaran melalui QRIS, dan tunggu proses.', 1),
  ('Berapa lama proses top up?', 'Proses top up biasanya membutuhkan waktu 1-5 menit setelah pembayaran dikonfirmasi.', 2),
  ('Metode pembayaran apa saja yang tersedia?', 'Saat ini kami menerima pembayaran melalui QRIS yang mendukung semua e-wallet dan m-banking.', 3),
  ('Bagaimana jika top up belum masuk?', 'Silakan hubungi customer service kami melalui WhatsApp yang tertera di website.', 4)
ON CONFLICT DO NOTHING;
