import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, Image, Ticket, ShoppingCart,
  Settings, Users, LogOut, Menu, X, Gamepad2
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Produk', path: '/admin/products', icon: Package },
  { name: 'Kategori', path: '/admin/categories', icon: Tags },
  { name: 'Banner', path: '/admin/banners', icon: Image },
  { name: 'Voucher', path: '/admin/vouchers', icon: Ticket },
  { name: 'Pesanan', path: '/admin/orders', icon: ShoppingCart },
  { name: 'Pengaturan', path: '/admin/settings', icon: Settings },
  { name: 'Admin', path: '/admin/admins', icon: Users },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden glass sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary" />
            <span className="font-bold">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm font-medium">{admin?.name}</p>
              <p className="text-xs text-muted">{admin?.role}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-white"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary" />
            <span className="font-bold text-lg">Ez-Store</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:bg-card hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">
                {admin?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{admin?.name}</p>
              <p className="text-xs text-muted">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
