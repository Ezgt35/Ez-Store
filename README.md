# Ez-Store - Top Up Game Platform

Platform top up game profesional dengan tampilan modern, proses cepat, dan integrasi pembayaran QRIS.

## Fitur Utama

### User
- Katalog produk dengan kategori game
- Detail produk dengan deskripsi lengkap
- Sistem checkout dengan validasi voucher
- Invoice dan status pembayaran real-time
- Pencarian pesanan

### Admin
- Dashboard dengan statistik
- CRUD Produk, Kategori, Banner
- Manajemen pesanan dengan update status
- Export data ke CSV
- Sistem voucher/promo

## Teknologi

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Pembayaran**: QRIS via Fersaku API

## Instalasi

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Environment

Buat file `.env` dengan konfigurasi berikut:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Jalankan Development Server

```bash
npm run dev
```

### 4. Build untuk Production

```bash
npm run build
```

## Struktur Folder

```
src/
├── components/
│   ├── admin/          # Komponen admin
│   └── shared/         # Komponen bersama
├── context/            # React Context
├── lib/                # Utility & konfigurasi
├── pages/
│   └── admin/          # Halaman admin
└── App.tsx             # Root component
```

## Integrasi Fersaku QRIS

### Konfigurasi Secret Key

Set environment variables di Supabase Dashboard:

1. Buka **Project Settings > Edge Functions > Secrets**
2. Tambahkan:
   - `FERSAKU_SECRET_KEY` - API key dari Fersaku
   - `FERSAKU_WEBHOOK_SECRET` - Secret untuk verifikasi webhook

### Webhook

Endpoint webhook: `/functions/v1/payment-webhook`

Konfigurasi callback URL di dashboard Fersaku:
```
https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook
```

## Akses Admin

### Login Admin
- URL: `/admin/login`
- Default: admin@ez-store.com / admin123

**PENTING**: Ganti password default setelah pertama kali login!

## Halaman Tersedia

### Public
- `/` - Home
- `/products` - Semua Produk
- `/product/:slug` - Detail Produk
- `/checkout` - Checkout
- `/invoice/:invoiceNumber` - Invoice
- `/check-order` - Cek Status Pesanan
- `/faq` - FAQ
- `/about` - Tentang Kami
- `/contact` - Hubungi Kami
- `/privacy` - Kebijakan Privasi
- `/terms` - Syarat & Ketentuan

### Admin
- `/admin/login` - Login Admin
- `/admin/dashboard` - Dashboard
- `/admin/products` - Kelola Produk
- `/admin/categories` - Kelola Kategori
- `/admin/orders` - Kelola Pesanan
- `/admin/settings` - Pengaturan Website

## Keamanan

- Row Level Security (RLS) di semua tabel
- Validasi input di frontend dan backend
- Verifikasi signature webhook
- Password hashing untuk admin
- Session management

## Custom Domain

1. Deploy ke Vercel/Netlify
2. Konfigurasi custom domain
3. Update URL di Supabase Dashboard

## Support

WhatsApp: Dikonfigurasi di settings
Email: support@ez-store.com

## Lisensi

MIT License
