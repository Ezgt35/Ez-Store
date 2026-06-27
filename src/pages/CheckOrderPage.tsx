import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Order, Payment } from '../lib/supabase';
import { formatDateTime, getStatusColor, getStatusText } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

export function CheckOrderPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<(Order & { payments: Payment[] })[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim() && !whatsapp.trim()) {
      showToast('error', 'Masukkan nomor invoice atau nomor WhatsApp');
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('orders')
        .select('*, payments(*)')
        .order('created_at', { ascending: false });

      if (invoiceNumber.trim()) {
        query = query.eq('invoice_number', invoiceNumber.trim().toUpperCase());
      } else if (whatsapp.trim()) {
        query = query.eq('whatsapp', whatsapp.replace(/\D/g, ''));
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast('error', 'Pesanan tidak ditemukan');
        setOrders([]);
      } else {
        setOrders(data as (Order & { payments: Payment[] })[]);
      }
    } catch (err) {
      console.error('Search error:', err);
      showToast('error', 'Gagal mencari pesanan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container-custom py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Cek Status Pesanan</h1>
          <p className="text-muted">Masukkan nomor invoice atau WhatsApp untuk melihat status pesanan</p>
        </div>

        <div className="card mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="label">Nomor Invoice</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value.toUpperCase());
                  setWhatsapp('');
                }}
                placeholder="Contoh: EZ240101ABC123"
                className="input"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted">atau</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
              <label className="label">Nomor WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  setInvoiceNumber('');
                }}
                placeholder="Contoh: 081234567890"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Mencari...' : 'Cari Pesanan'}
            </button>
          </form>
        </div>

        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Hasil Pencarian</h2>
            {orders.map((order) => {
              const latestPayment = order.payments?.[0];
              const paymentStatus = latestPayment?.status || order.payment_status;

              return (
                <div
                  key={order.id}
                  className="card cursor-pointer hover:border-primary"
                  onClick={() => navigate(`/invoice/${order.invoice_number}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-bold">{order.invoice_number}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-muted">
                          <span className="text-white">UID:</span> {order.uid}
                          {order.server && ` (${order.server})`}
                        </p>
                        <p className="text-muted">
                          Tanggal: {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary mb-2">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(order.total)}
                      </p>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`badge badge-${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <span className={`badge badge-${getStatusColor(paymentStatus)}`}>
                          {getStatusText(paymentStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Klik untuk detail</span>
                      <span className="text-primary">Lihat Invoice</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="card mt-8 bg-primary/10 border-primary/30">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">Tidak dapat menemukan pesanan?</p>
              <p className="text-muted">
                Pastikan nomor invoice yang dimasukkan sudah benar. Jika masih mengalami masalah,
                hubungi CS kami via WhatsApp di{' '}
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
