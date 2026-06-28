import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Package, ShoppingCart, DollarSign, Clock,
  AlertCircle, CheckCircle
} from 'lucide-react';
import type { Order, Product } from '../../lib/supabase';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../lib/utils';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Skeleton } from '../../components/shared/Skeleton';

export function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(false);
      
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: 'fetch_dashboard' }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.warn('Dashboard API returned error:', data.error || data);
          // Show dashboard with empty data instead of blocking
          return;
        }

        setStats({
          totalProducts: data.totalProducts || 0,
          totalOrders: data.totalOrders || 0,
          todayRevenue: data.todayRevenue || 0,
          monthRevenue: data.monthRevenue || 0,
          pendingOrders: data.pendingOrders || 0,
          completedOrders: data.completedOrders || 0,
        });
        setRecentOrders(data.recentOrders || []);
        setPopularProducts(data.popularProducts || []);
      } catch (err) {
        console.warn('Failed to fetch dashboard data:', err);
        // Show dashboard with empty data instead of blocking
      }
    };

    fetchDashboardData();
  }, [token]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted">Selamat datang di panel admin Ez-Store</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Produk</p>
                <p className="text-2xl font-bold mt-1">{stats.totalProducts}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Pesanan</p>
                <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/10">
                <ShoppingCart className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Pendapatan Hari Ini</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Pendapatan Bulan Ini</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.monthRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-warning/10 border-warning/30">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-warning" />
              <div>
                <p className="text-sm text-muted">Menunggu</p>
                <p className="text-xl font-bold">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="card bg-success/10 border-success/30">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted">Selesai</p>
                <p className="text-xl font-bold">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="card bg-error/10 border-error/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-error" />
              <div>
                <p className="text-sm text-muted">Batal/Gagal</p>
                <p className="text-xl font-bold">{stats.totalOrders - stats.pendingOrders - stats.completedOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pesanan Terbaru</h2>
              <Link to="/admin/orders" className="text-sm text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-mono text-sm">{order.invoice_number}</p>
                      <p className="text-xs text-muted">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.total)}</p>
                      <span className={`badge badge-${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">Belum ada pesanan</p>
            )}
          </div>

          {/* Popular Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Produk Populer</h2>
              <Link to="/admin/products" className="text-sm text-primary hover:underline">
                Kelola Produk
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : popularProducts.length > 0 ? (
              <div className="space-y-3">
                {popularProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    {product.logo_url ? (
                      <img src={product.logo_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted">{formatCurrency(product.final_price)}</p>
                    </div>
                    {hasDiscount(product) && (
                      <span className="badge badge-error">-{product.discount_percent}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">Belum ada produk populer</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function hasDiscount(product: Product): boolean {
  return product.discount_percent > 0;
}
