import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FAQ as FAQType } from '../lib/supabase';
import { PageLoader } from '../components/shared/LoadingSpinner';
import { useSettings } from '../context/SettingsContext';

export function FAQPage() {
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQType[]>([]);

  useEffect(() => {
    const fetchFAQ = async () => {
      const { data } = await supabase
        .from('faq')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setFaqs(data || []);
      setLoading(false);
    };
    fetchFAQ();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">FAQ</h1>
        <p className="text-muted mb-8">Pertanyaan yang sering diajukan</p>

        {faqs.length > 0 ? (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.id} className="card group">
                <summary className="cursor-pointer list-none flex items-center justify-between pr-4">
                  <h3 className="font-medium pr-4">{faq.question}</h3>
                  <ChevronRight className="w-5 h-5 text-muted group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-4 text-sm text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-muted">Belum ada FAQ yang tersedia</p>
          </div>
        )}
      </div>
    </main>
  );
}

export function AboutPage() {
  const { settings } = useSettings();

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Tentang Kami</h1>
        <p className="text-muted mb-8">Kenali {settings.site_name}</p>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Siapa Kami?</h2>
          <p className="text-muted leading-relaxed">
            {settings.site_name} adalah platform top up game terpercaya yang menyediakan layanan
            pengisian diamond, UC, dan voucher game dengan harga terbaik dan proses tercepat.
            Kami berkomitmen untuk memberikan pengalaman berbelanja yang aman, mudah, dan nyaman.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary mb-2">50K+</div>
            <p className="text-muted">Transaksi Sukses</p>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
            <p className="text-muted">Layanan Aktif</p>
          </div>
          <div className="card text-center">
            <div className="text-4xl font-bold text-primary mb-2">100%</div>
            <p className="text-muted">Kepuasan Pelanggan</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Visi & Misi</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Visi</h3>
              <p className="text-muted">
                Menjadi platform top up game terdepan dan terpercaya di Indonesia.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Misi</h3>
              <ul className="text-muted space-y-2">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  Menyediakan layanan top up dengan harga bersaing
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  Memastikan transaksi aman dan cepat
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  Memberikan pelayanan terbaik untuk setiap pelanggan
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { settings } = useSettings();

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Hubungi Kami</h1>
        <p className="text-muted mb-8">Ada pertanyaan? Kami siap membantu!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">WhatsApp</h2>
            <p className="text-muted mb-4">Fast response melalui WhatsApp</p>
            <a
              href={`https://wa.me/${settings.contact_whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Chat WhatsApp
            </a>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Email</h2>
            <p className="text-muted mb-4">Kirim pertanyaan via email</p>
            <a
              href={`mailto:${settings.contact_email}`}
              className="btn-primary"
            >
              Kirim Email
            </a>
          </div>

          {settings.instagram_url && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Instagram</h2>
              <p className="text-muted mb-4">Follow untuk info promo</p>
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Follow Instagram
              </a>
            </div>
          )}

          {settings.youtube_url && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">YouTube</h2>
              <p className="text-muted mb-4">Tutorial dan info game</p>
              <a
                href={settings.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Subscribe YouTube
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export function PrivacyPolicyPage() {
  const { settings } = useSettings();

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kebijakan Privasi</h1>

        <div className="card space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Informasi yang Kami Kumpulkan</h2>
            <p className="text-muted leading-relaxed">
              Kami mengumpulkan informasi yang Anda berikan saat melakukan transaksi, termasuk UID game,
              nomor WhatsApp, dan alamat email (opsional). Informasi ini digunakan untuk memproses pesanan
              dan menghubungi Anda terkait transaksi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Penggunaan Informasi</h2>
            <p className="text-muted leading-relaxed">
              Informasi yang dikumpulkan digunakan untuk: memproses transaksi, mengirim notifikasi
              pembayaran, memberikan layanan pelanggan, dan meningkatkan layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Keamanan Data</h2>
            <p className="text-muted leading-relaxed">
              Kami berkomitmen untuk melindungi data Anda dengan implementasi keamanan yang sesuai.
              Pembayaran diproses melalui gateway terpercaya dan data sensitif dienkripsi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies</h2>
            <p className="text-muted leading-relaxed">
              {settings.site_name} dapat menggunakan cookies untuk meningkatkan pengalaman pengguna
              dan analisis website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Kontak</h2>
            <p className="text-muted leading-relaxed">
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami
              melalui WhatsApp atau email yang tertera di halaman Kontak.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export function TermsPage() {
  const { settings } = useSettings();

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Syarat & Ketentuan</h1>

        <div className="card space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Ketentuan Umum</h2>
            <p className="text-muted leading-relaxed">
              Dengan menggunakan layanan {settings.site_name}, Anda menyetujui semua syarat dan
              ketentuan yang berlaku. Layanan kami disediakan untuk pengguna yang berusia minimal
              18 tahun atau memiliki izin orang tua/wali.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Transaksi</h2>
            <p className="text-muted leading-relaxed">
              Setiap transaksi yang dilakukan dianggap final. Harap pastikan semua data yang dimasukkan
              sudah benar sebelum melakukan pembayaran. Kesalahan input data akun bukan tanggung jawab kami.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Pembayaran</h2>
            <p className="text-muted leading-relaxed">
              Pembayaran dilakukan melalui QRIS yang mendukung berbagai e-wallet dan m-banking.
              Setelah pembayaran berhasil, transaksi akan diproses dalam 1-5 menit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Proses Top Up</h2>
            <p className="text-muted leading-relaxed">
              Waktu proses top up bervariasi tergantung game dan metode pembayaran. Kami akan berusaha
              memproses setiap transaksi secepat mungkin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Pengembalian Dana</h2>
            <p className="text-muted leading-relaxed">
              Pengembalian dana dapat diajukan jika transaksi gagal karena kesalahan sistem kami.
              Pengajuan pengembalian dana dapat dilakukan melalui WhatsApp support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Perubahan Layanan</h2>
            <p className="text-muted leading-relaxed">
              Kami berhak mengubah produk, harga, atau layanan kapan saja tanpa pemberitahuan terlebih
              dahulu. Perubahan akan diinformasikan melalui website atau media sosial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Kontak</h2>
            <p className="text-muted leading-relaxed">
              Untuk pertanyaan atau keluhan, silakan hubungi customer service kami melalui WhatsApp
              yang tertera di website.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="container-custom py-16">
      <div className="card text-center max-w-lg mx-auto">
        <div className="text-8xl font-bold text-gradient mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-muted mb-6">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <Link to="/" className="btn-primary">
          Kembali ke Home
        </Link>
      </div>
    </main>
  );
}

export function ServerErrorPage() {
  return (
    <main className="container-custom py-16">
      <div className="card text-center max-w-lg mx-auto">
        <div className="text-8xl font-bold text-error mb-4">500</div>
        <h1 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h1>
        <p className="text-muted mb-6">
          Server sedang mengalami gangguan. Silakan coba lagi beberapa saat lagi.
        </p>
        <Link to="/" className="btn-primary">
          Kembali ke Home
        </Link>
      </div>
    </main>
  );
}
