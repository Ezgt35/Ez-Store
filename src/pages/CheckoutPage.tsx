import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShoppingCart, Tag, AlertCircle, CreditCard, CheckCircle,
  ChevronLeft, Info, QrCode
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Voucher } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { PageLoader } from '../components/shared/LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface CheckoutState {
  productId: string;
  uid: string;
  server: string;
  quantity: number;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const checkoutState = location.state as CheckoutState;

  const [formData, setFormData] = useState({
    uid: checkoutState?.uid || '',
    server: checkoutState?.server || '',
    quantity: checkoutState?.quantity || 1,
    whatsapp: '',
    email: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProduct = async () => {
      if (!checkoutState?.productId) {
        setLoading(false);
        return;
      }

      const { data: productData, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', checkoutState.productId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !productData) {
        showToast('error', 'Produk tidak ditemukan');
        navigate('/products');
      } else {
        setProduct(productData);
        setFormData((prev) => ({
          ...prev,
          uid: checkoutState.uid || prev.uid,
          server: checkoutState.server || prev.server,
          quantity: checkoutState.quantity || prev.quantity,
        }));
      }
      setLoading(false);
    };

    fetchProduct();
  }, [checkoutState, navigate, showToast]);

  const validateVoucher = async () => {
    if (!voucherInput.trim()) {
      showToast('error', 'Masukkan kode voucher');
      return;
    }

    setValidatingVoucher(true);
    try {
      const { data: voucherData, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherInput.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !voucherData) {
        showToast('error', 'Kode voucher tidak valid');
        setAppliedVoucher(null);
        return;
      }

      const now = new Date();
      const validFrom = new Date(voucherData.valid_from);
      const validUntil = new Date(voucherData.valid_until);

      if (now < validFrom || now > validUntil) {
        showToast('error', 'Voucher sudah tidak berlaku');
        setAppliedVoucher(null);
        return;
      }

      if (voucherData.usage_limit !== -1 && voucherData.used_count >= voucherData.usage_limit) {
        showToast('error', 'Voucher sudah mencapai batas penggunaan');
        setAppliedVoucher(null);
        return;
      }

      if (voucherData.min_purchase > 0) {
        const subtotal = product!.final_price * formData.quantity;
        if (subtotal < voucherData.min_purchase) {
          showToast('error', `Minimum pembelian ${formatCurrency(voucherData.min_purchase)}`);
          setAppliedVoucher(null);
          return;
        }
      }

      setAppliedVoucher(voucherData);
      showToast('success', 'Voucher berhasil diterapkan');
    } catch (err) {
      showToast('error', 'Gagal memvalidasi voucher');
    } finally {
      setValidatingVoucher(false);
    }
  };

  const calculateDiscount = () => {
    if (!appliedVoucher) return 0;
    const subtotal = product!.final_price * formData.quantity;
    if (appliedVoucher.discount_type === 'percent') {
      const discount = subtotal * (appliedVoucher.discount_value / 100);
      return appliedVoucher.max_discount
        ? Math.min(discount, appliedVoucher.max_discount)
        : discount;
    }
    return Math.min(appliedVoucher.discount_value, subtotal);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.uid.trim()) newErrors.uid = 'UID harus diisi';
    if (product?.requires_server && !formData.server.trim()) {
      newErrors.server = 'Server harus diisi';
    }
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'Nomor WhatsApp harus diisi';
    } else if (!/^[0-9]{10,15}$/.test(formData.whatsapp.replace(/\D/g, ''))) {
      newErrors.whatsapp = 'Format nomor tidak valid';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !product) return;

    setSubmitting(true);
    try {
      if (product.stock !== -1 && product.stock < formData.quantity) {
        showToast('error', 'Stok produk tidak mencukupi untuk jumlah yang dipilih');
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          uid: formData.uid,
          server: formData.server || null,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          email: formData.email || null,
          productId: product.id,
          quantity: formData.quantity,
          voucherCode: appliedVoucher?.code || null,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        showToast('error', result.error || 'Gagal membuat pesanan');
        setSubmitting(false);
        return;
      }

      const orderData = result.order;
      const paymentData = result.payment;

      navigate(`/invoice/${orderData.invoice_number}`, {
        state: { payment: paymentData },
      });
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!product) {
    return (
      <main className="container-custom py-8">
        <div className="card text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted mb-4" />
          <h2 className="text-2xl font-bold mb-2">Tidak ada produk</h2>
          <p className="text-muted mb-4">Pilih produk terlebih dahulu untuk checkout</p>
          <Link to="/products" className="btn-primary">
            Lihat Produk
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = product.final_price * formData.quantity;
  const discount = calculateDiscount();
  const total = subtotal - discount;
  const hasDiscount = product.discount_percent > 0 || appliedVoucher !== null;

  return (
    <main className="container-custom py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Kembali
      </button>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Summary */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Produk
            </h2>
            <div className="flex items-center gap-4">
              {product.logo_url ? (
                <img
                  src={product.logo_url}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-muted" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted">x{formData.quantity}</p>
                <p className="text-primary font-semibold mt-1">
                  {formatCurrency(product.final_price)}
                </p>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Data Akun
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">UID / ID Akun</label>
                <input
                  type="text"
                  value={formData.uid}
                  onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                  placeholder="Masukkan UID akun"
                  className={`input ${errors.uid ? 'input-error' : ''}`}
                  required
                />
                {errors.uid && (
                  <p className="text-xs text-error mt-1">{errors.uid}</p>
                )}
              </div>

              {product.requires_server && (
                <div>
                  <label className="label">Server</label>
                  <input
                    type="text"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    placeholder="Masukkan server"
                    className={`input ${errors.server ? 'input-error' : ''}`}
                    required
                  />
                  {errors.server && (
                    <p className="text-xs text-error mt-1">{errors.server}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Kontak & Pembayaran
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className={`input ${errors.whatsapp ? 'input-error' : ''}`}
                  required
                />
                {errors.whatsapp && (
                  <p className="text-xs text-error mt-1">{errors.whatsapp}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  Untuk notifikasi status transaksi
                </p>
              </div>

              <div>
                <label className="label">Email (Opsional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-error mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="label">Catatan (Opsional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                  className="input min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Voucher */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Voucher
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                placeholder="Masukkan kode voucher"
                className="input flex-1"
                disabled={appliedVoucher !== null}
              />
              {appliedVoucher ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedVoucher(null);
                    setVoucherInput('');
                  }}
                  className="btn-error"
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={validateVoucher}
                  className="btn-primary"
                  disabled={validatingVoucher}
                >
                  {validatingVoucher ? 'Validasi...' : 'Terapkan'}
                </button>
              )}
            </div>
            {appliedVoucher && (
              <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-success">Voucher Diterapkan</p>
                  <p className="text-sm text-muted">
                    {appliedVoucher.code} -
                    {appliedVoucher.discount_type === 'percent'
                      ? ` ${appliedVoucher.discount_value}%`
                      : ` ${formatCurrency(appliedVoucher.discount_value)}`}
                    , Potongan: {formatCurrency(discount)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Ringkasan Pesanan</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {hasDiscount && product.discount_percent > 0 && !appliedVoucher && (
                <div className="flex justify-between text-success">
                  <span>Diskon Produk</span>
                  <span>-{formatCurrency(subtotal - product.final_price * formData.quantity)}</span>
                </div>
              )}

              {appliedVoucher && (
                <div className="flex justify-between text-success">
                  <span>Voucher</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-primary" />
                <span className="font-medium">Pembayaran QRIS</span>
              </div>
              <p className="text-xs text-muted">
                Scan QR code menggunakan e-wallet atau m-banking
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full mt-6"
            >
              {submitting ? 'Memproses...' : 'Bayar Sekarang'}
            </button>

            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted">
                Pastikan data yang dimasukkan sudah benar. Kesalahan akun bukan tanggung jawab kami.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
