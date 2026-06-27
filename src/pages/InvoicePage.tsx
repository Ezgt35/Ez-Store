import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  QrCode, Clock, Copy, CheckCircle, XCircle, AlertCircle,
  FileText, RefreshCw
} from 'lucide-react';
import type { Order, Payment, OrderItem } from '../lib/supabase';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../lib/utils';
import { PageLoader } from '../components/shared/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

export function InvoicePage() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceNumber) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ invoiceNumber }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setLoading(false);
        return;
      }

      setOrder(result.order);
      setOrderItems(result.order?.order_items || []);
      setPayment(result.order?.payments?.[0] || null);
      setLoading(false);
    };

    fetchInvoice();
  }, [invoiceNumber]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending' || !payment.expired_at) return;

    const calculateTimeLeft = () => {
      const expired = new Date(payment.expired_at!).getTime();
      const now = Date.now();
      return Math.max(0, expired - now);
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        refreshPayment();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [payment]);

  useEffect(() => {
    if (!order || !payment) return;

    const shouldPoll = payment.status === 'pending' && order.payment_status === 'waiting_payment';
    if (!shouldPoll) return;

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ orderId: order.id }),
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok && result.payment) {
          setPayment(result.payment);
          if (result.order) {
            setOrder(result.order);
          }
        }
      } catch (error) {
        console.error('Polling payment status failed:', error);
      }
    };

    pollPaymentStatus();
    const interval = window.setInterval(pollPaymentStatus, 10000);
    return () => window.clearInterval(interval);
  }, [order, payment]);

  const refreshPayment = async () => {
    if (!order) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return;
      }

      if (result.payment) {
        setPayment(result.payment);
      }
      if (result.order) {
        setOrder(result.order);
      }
    } catch (err) {
      console.error('Refresh payment failed:', err);
    }
  };

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return '00:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('success', 'Nomor invoice berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!order || !payment) return;

    if (order.payment_status !== 'waiting_payment' || payment.status !== 'pending') {
      showToast('error', 'Pesanan ini tidak bisa dibatalkan lagi');
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          orderId: order.id,
          invoiceNumber: order.invoice_number,
          reason: 'Dibatalkan oleh pengguna',
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        showToast('error', result.error || 'Gagal membatalkan pesanan');
        setCancelling(false);
        return;
      }

      setOrder(result.order);
      showToast('success', 'Pesanan berhasil dibatalkan');
    } catch (error) {
      console.error('Cancel order failed:', error);
      showToast('error', 'Gagal membatalkan pesanan');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!order) {
    return (
      <main className="container-custom py-8">
        <div className="card text-center py-12">
          <XCircle className="w-16 h-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invoice Tidak Ditemukan</h2>
          <p className="text-muted mb-4">Nomor invoice yang Anda cari tidak valid</p>
          <Link to="/check-order" className="btn-primary">
            Cek Pesanan Lainnya
          </Link>
        </div>
      </main>
    );
  }

  const isPaid = payment?.status === 'paid' || order.payment_status === 'paid';
  const isExpired = payment?.status === 'expired' || timeLeft <= 0;
  const isFailed = payment?.status === 'failed';

  return (
    <main className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Invoice</h1>
          <button
            onClick={refreshPayment}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Status Banner */}
        <div className={`card mb-6 ${isPaid ? 'bg-success/10 border-success/30' : isExpired || isFailed ? 'bg-error/10 border-error/30' : 'bg-warning/10 border-warning/30'}`}>
          <div className="flex items-center gap-4">
            {isPaid ? (
              <CheckCircle className="w-12 h-12 text-success" />
            ) : isExpired || isFailed ? (
              <XCircle className="w-12 h-12 text-error" />
            ) : (
              <Clock className="w-12 h-12 text-warning" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${isPaid ? 'text-success' : isExpired || isFailed ? 'text-error' : 'text-warning'}`}>
                {isPaid ? 'Pembayaran Berhasil' : isExpired ? 'Pembayaran Kedaluwarsa' : isFailed ? 'Pembayaran Gagal' : 'Menunggu Pembayaran'}
              </h2>
              <p className="text-sm text-muted">
                {isPaid ? 'Terima kasih! Pesanan Anda sedang diproses.' : isExpired ? 'Batas waktu pembayaran sudah lewat.' : 'Scan QR code untuk membayar'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Section */}
          {!isPaid && !isExpired && !isFailed && payment && (
            <div className="card">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  {payment.qr_code_url || payment.qris_string ? (
                    <img
                      src={payment.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payment.qris_string || '')}`}
                      alt="QRIS Code"
                      className="w-64 h-64 mx-auto rounded-lg border border-border bg-white p-4"
                    />
                  ) : (
                    <div className="w-64 h-64 mx-auto rounded-lg border border-border bg-background flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-muted" />
                    </div>
                  )}
                </div>
                {payment.qr_code_url ? null : payment.qris_string ? (
                  <div className="mb-4 text-xs text-muted">
                    <p>Jika QR tidak muncul, gunakan kode QRIS berikut:</p>
                    <p className="font-mono break-all">{payment.qris_string}</p>
                  </div>
                ) : null}
                <div className="mb-4">
                  <p className="text-sm text-muted mb-1">Waktu tersisa</p>
                  <span className={`text-2xl font-mono font-bold ${timeLeft < 300000 ? 'text-error' : 'text-warning'}`}>
                    {formatTimeLeft(timeLeft)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-primary mb-4">
                  {formatCurrency(payment.amount)}
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted mb-1">Reference ID</p>
                  <p className="font-mono text-sm">{payment.reference_id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Details */}
          <div className="space-y-6">
            {/* Invoice Info */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted">Invoice</p>
                  <p className="text-xl font-bold font-mono">{order.invoice_number}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(order.invoice_number)}
                  className="btn-secondary py-2 px-3"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Tanggal</span>
                  <span>{formatDateTime(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status Pesanan</span>
                  <span className={`badge badge-${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status Pembayaran</span>
                  <span className={`badge badge-${getStatusColor(order.payment_status)}`}>
                    {getStatusText(order.payment_status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Data Akun
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted">UID:</span>
                  <span className="ml-2 font-medium">{order.uid}</span>
                </div>
                {order.server && (
                  <div>
                    <span className="text-muted">Server:</span>
                    <span className="ml-2 font-medium">{order.server}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="card mt-6">
          <h3 className="font-semibold mb-4">Produk yang Dipesan</h3>
          <div className="space-y-3">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-muted">x{item.quantity}</p>
                </div>
                <p className="font-medium">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Diskon</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card mt-6">
          <h3 className="font-semibold mb-4">Informasi Kontak</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted">WhatsApp</p>
              <p className="font-medium">{order.whatsapp}</p>
            </div>
            {order.email && (
              <div>
                <p className="text-muted">Email</p>
                <p className="font-medium">{order.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link to="/products" className="btn-primary flex-1">
            Kembali Berbelanja
          </Link>
          {!isPaid && !isExpired && !isFailed && order && (
            <>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || order.payment_status !== 'waiting_payment'}
                className="btn-secondary flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
              </button>
              <Link to={`/product/${orderItems[0]?.product_id}`} className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Buat Ulang
              </Link>
            </>
          )}
        </div>

        {/* Help */}
        <div className="card mt-6 bg-primary/10 border-primary/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">Butuh Bantuan?</p>
              <p className="text-muted">
                Hubungi kami via WhatsApp di{' '}
                <a
                  href={`https://wa.me/${settings.contact_whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {settings.contact_whatsapp}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
