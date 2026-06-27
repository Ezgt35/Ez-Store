import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Tag, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../lib/supabase';
import { PageLoader } from '../components/shared/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [uid, setUid] = useState('');
  const [server, setServer] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const { data: productData, error } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !productData) {
          setProduct(null);
        } else {
          setProduct(productData);
          if (productData.category_id) {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('*')
              .eq('id', productData.category_id)
              .maybeSingle();
            setCategory(categoryData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    const subscription = supabase
      .channel(`product-${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        () => {
          fetchProduct();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [slug]);

  const handleCheckout = () => {
    if (!uid.trim()) {
      showToast('error', 'UID harus diisi');
      return;
    }
    if (product?.requires_server && !server.trim()) {
      showToast('error', 'Server harus diisi');
      return;
    }
    if (product?.stock === 0) {
      showToast('error', 'Stok habis');
      return;
    }
    if (product?.stock !== -1 && product && quantity > product.stock) {
      showToast('error', `Stok tersedia hanya ${product.stock}`);
      return;
    }

    navigate('/checkout', {
      state: {
        productId: product?.id,
        uid,
        server,
        quantity,
      },
    });
  };

  if (loading) return <PageLoader />;

  if (!product) {
    return (
      <main className="container-custom py-8">
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted mb-4" />
          <h2 className="text-2xl font-bold mb-2">Produk tidak ditemukan</h2>
          <p className="text-muted mb-4">Produk yang Anda cari tidak tersedia</p>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Lihat Semua Produk
          </button>
        </div>
      </main>
    );
  }

  const subtotal = product.final_price * quantity;
  const hasDiscount = product.discount_percent > 0;

  return (
    <main className="container-custom py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-8">
        <button onClick={() => navigate('/')} className="hover:text-white">
          Home
        </button>
        <span>/</span>
        <button onClick={() => navigate('/products')} className="hover:text-white">
          Produk
        </button>
        {category && (
          <>
            <span>/</span>
            <button
              onClick={() => navigate(`/products?category=${category.slug}`)}
              className="hover:text-white"
            >
              {category.name}
            </button>
          </>
        )}
        <span>/</span>
        <span className="text-white">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="card aspect-video bg-background overflow-hidden relative rounded-xl">
            {product.logo_url ? (
              <img
                src={product.logo_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20">
                <Package className="w-24 h-24 text-muted" />
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-4 left-4 badge-error text-lg px-4 py-1">
                -{product.discount_percent}% OFF
              </span>
            )}
            {product.is_popular && (
              <span className="absolute top-4 right-4 badge-primary">Populer</span>
            )}
          </div>
          {product.banner_url && (
            <div className="card aspect-[3/1] bg-background overflow-hidden rounded-xl">
              <img
                src={product.banner_url}
                alt={`${product.name} banner`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="card mb-6">
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {category && (
              <span className="badge badge-primary mb-4">{category.name}</span>
            )}
            {product.description && (
              <p className="text-muted mb-6">{product.description}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(product.final_price)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-muted line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>

            {/* Stock */}
            {product.stock !== -1 && (
              <div className="mb-4">
                <span className={`text-sm ${product.stock > 10 ? 'text-success' : product.stock > 0 ? 'text-warning' : 'text-error'}`}>
                  Stok: {product.stock > 0 ? `${product.stock} tersedia` : 'Habis'}
                </span>
              </div>
            )}
          </div>

          {/* Order Form */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Form Top Up
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">UID / ID Akun</label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Masukkan UID akun Anda"
                  className="input"
                />
                <p className="text-xs text-muted mt-1">
                  Cek UID pada profil game Anda
                </p>
              </div>

              {product.requires_server && (
                <div>
                  <label className="label">Server</label>
                  <input
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="Masukkan server akun Anda"
                    className="input"
                  />
                </div>
              )}

              <div>
                <label className="label">Jumlah</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="btn-secondary py-2 px-4 rounded-lg"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input w-24 text-center"
                    min={1}
                  />
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="btn-secondary py-2 px-4 rounded-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Subtotal */}
            <div className="border-t border-border mt-6 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted">Subtotal ({quantity}x)</span>
                <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={product.stock === 0 || (product.stock !== -1 && quantity > product.stock)}
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock === 0 ? 'Stok Habis' : 'Lanjut ke Pembayaran'}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="card bg-warning/10 border-warning/30 mt-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning mb-1">Perhatian</p>
                <p className="text-muted">
                  Pastikan UID dan Server yang dimasukkan sudah benar. Kesalahan input bukan tanggung jawab kami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
