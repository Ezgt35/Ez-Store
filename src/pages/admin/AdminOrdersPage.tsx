import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, ExternalLink, Filter, Download } from 'lucide-react';
import type { Order, OrderItem } from '../../lib/supabase';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../lib/utils';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Skeleton } from '../../components/shared/Skeleton';


type OrderWithItems = Order & { order_items: OrderItem[] };

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({
          action: 'fetch_orders',
          payload: {
            statusFilter,
            searchQuery,
            limit: 100,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast('error', data.error || 'Gagal memuat pesanan');
        setOrders([]);
      } else {
        setOrders(data.orders || []);
      }
    } catch (err) {
      showToast('error', 'Gagal memuat pesanan');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.whatsapp.includes(searchQuery)
  );

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    if (!token) {
      showToast('error', 'Unauthorized');
      setUpdating(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({
          action: 'update_order_status',
          payload: { orderId, status },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast('error', data.error || 'Gagal mengupdate status');
      } else {
        showToast('success', 'Status berhasil diupdate');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: status as Order['status'] });
        }
      }
    } catch (err) {
      showToast('error', 'Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('error', 'Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['Invoice', 'UID', 'Server', 'WhatsApp', 'Total', 'Status', 'Created'];
    const rows = filteredOrders.map((o) => [
      o.invoice_number,
      o.uid,
      o.server || '',
      o.whatsapp,
      o.total,
      o.status,
      formatDateTime(o.created_at),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Data berhasil diekspor');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pesanan</h1>
            <p className="text-muted">Kelola semua pesanan</p>
          </div>
          <button onClick={exportToCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="card flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari invoice, UID, atau WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted">Invoice</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Produk</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Akun</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Total</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Tanggal</th>
                    <th className="text-right p-4 text-sm font-medium text-muted">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border hover:bg-card/50">
                      <td className="p-4">
                        <p className="font-mono font-medium">{order.invoice_number}</p>
                        <p className="text-xs text-muted">{order.whatsapp}</p>
                      </td>
                      <td className="p-4">
                        {order.order_items.map((item) => (
                          <p key={item.id} className="text-sm">{item.product_name} x{item.quantity}</p>
                        ))}
                      </td>
                      <td className="p-4 text-sm">
                        <p>{order.uid}</p>
                        {order.server && <p className="text-muted text-xs">Server: {order.server}</p>}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(order.total)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`badge badge-${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <span className={`badge badge-${getStatusColor(order.payment_status)}`}>
                            {getStatusText(order.payment_status)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{formatDateTime(order.created_at)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn-secondary py-1.5 px-3 text-sm"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => window.open(`/invoice/${order.invoice_number}`, '_blank')}
                            className="p-2 hover:bg-card rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4 text-muted" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted mb-4" />
              <p className="text-muted">Tidak ada pesanan</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Detail Pesanan</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-muted hover:text-white">
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="card bg-background">
                <p className="text-sm text-muted">Invoice</p>
                <p className="font-mono text-lg">{selectedOrder.invoice_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-background">
                  <p className="text-sm text-muted">UID</p>
                  <p className="font-medium">{selectedOrder.uid}</p>
                </div>
                <div className="card bg-background">
                  <p className="text-sm text-muted">Server</p>
                  <p className="font-medium">{selectedOrder.server || '-'}</p>
                </div>
              </div>

              <div className="card bg-background">
                <p className="text-sm text-muted mb-2">Produk</p>
                {selectedOrder.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
                    <p>{item.product_name} x{item.quantity}</p>
                    <p>{formatCurrency(item.total)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold">
                  <p>Total</p>
                  <p className="text-primary">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              <div className="card bg-background">
                <p className="text-sm text-muted mb-2">Status Pesanan</p>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'processing', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      disabled={updating}
                      className={`btn py-1.5 px-3 text-sm ${
                        selectedOrder.status === status ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    navigate(`/invoice/${selectedOrder.invoice_number}`);
                  }}
                  className="btn-primary flex-1"
                >
                  Lihat Invoice
                </button>
                <button onClick={() => setSelectedOrder(null)} className="btn-secondary flex-1">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
