import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Headphones, Clock, ChevronRight, Star,
  ShoppingCart, Gamepad2, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';
import type { Product, Category, Banner, Testimonial, FAQ as FAQType } from '../lib/supabase';
import { ProductCard } from '../components/shared/ProductCard';
import { CategoryCard } from '../components/shared/CategoryCard';
import { BannerSlider } from '../components/shared/BannerSlider';
import { PageLoader } from '../components/shared/LoadingSpinner';

export function HomePage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          bannersRes,
          categoriesRes,
          productsRes,
          testimonialsRes,
          faqRes,
        ] = await Promise.all([
          supabase.from('banners').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('products').select('*').eq('is_active', true).eq('is_popular', true).limit(8),
          supabase.from('testimonials').select('*').eq('is_active', true).limit(5),
          supabase.from('faq').select('*').eq('is_active', true).order('sort_order').limit(4),
        ]);

        if (bannersRes.data) setBanners(bannersRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (productsRes.data) setPopularProducts(productsRes.data);
        if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
        if (faqRes.data) setFaqs(faqRes.data);
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  const features = [
    { icon: Zap, title: 'Proses Cepat', description: 'Top up langsung masuk 1-5 menit' },
    { icon: Shield, title: 'Aman & Terpercaya', description: 'Pembayaran via QRIS yang aman' },
    { icon: Headphones, title: 'Support 24/7', description: 'Tim support siap membantu' },
    { icon: Clock, title: '24 Jam Non-Stop', description: 'Layanan tersedia 24/7' },
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5" />
        <div className="container-custom py-12 md:py-20">
          {banners.length > 0 ? (
            <BannerSlider banners={banners} />
          ) : (
            <div className="card aspect-[3/1] flex items-center justify-center">
              <div className="text-center">
                <Gamepad2 className="w-16 h-16 mx-auto text-primary mb-4" />
                <h1 className="text-3xl md:text-5xl font-bold mb-4">
                  <span className="text-gradient">{settings.site_name}</span>
                </h1>
                <p className="text-muted text-lg">{settings.site_tagline}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="container-custom py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Pilih Game</h2>
            <Link to="/products" className="text-primary hover:text-secondary flex items-center gap-1 text-sm">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="container-custom py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Produk Populer</h2>
            </div>
            <Link to="/products" className="text-primary hover:text-secondary flex items-center gap-1 text-sm">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-card/30 border-y border-border py-12">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-center mb-8">Kenapa Pilih {settings.site_name}?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card text-center group hover:border-primary">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container-custom py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Cara Top Up</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Pilih Game', description: 'Pilih game yang ingin di top up' },
            { step: 2, title: 'Masukkan Data', description: 'Masukkan UID dan server (jika diperlukan)' },
            { step: 3, title: 'Pilih Nominal', description: 'Pilih nominal dan lakukan pembayaran' },
            { step: 4, title: 'Selesai', description: 'Diamond langsung masuk ke akun' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-card/30 border-y border-border py-12">
          <div className="container-custom">
            <h2 className="text-2xl font-bold text-center mb-8">Apa Kata Mereka</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="card">
                  <div className="flex items-center gap-3 mb-4">
                    {testimonial.avatar_url ? (
                      <img src={testimonial.avatar_url} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {testimonial.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      {testimonial.rating && (
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < testimonial.rating! ? 'text-warning fill-warning' : 'text-muted'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted">{testimonial.content}</p>
                  {testimonial.game && (
                    <span className="badge badge-primary mt-3">{testimonial.game}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-custom py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Pertanyaan Umum</h2>
          <div className="max-w-3xl mx-auto space-y-4">
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
          <div className="text-center mt-6">
            <Link to="/faq" className="btn-outline">
              Lihat Semua FAQ
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-custom py-12">
        <div className="card text-center bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/30">
          <ShoppingCart className="w-12 h-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Siap Top Up?</h2>
          <p className="text-muted mb-6">Pilih game favoritmu dan rasakan kemudahan top up di {settings.site_name}</p>
          <Link to="/products" className="btn-primary">
            Mulai Top Up
          </Link>
        </div>
      </section>
    </main>
  );
}
