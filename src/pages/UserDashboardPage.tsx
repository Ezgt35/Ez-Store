import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShoppingBag, Clock } from 'lucide-react';

export function UserDashboardPage() {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Selamat datang, {user?.name}!</h1>
              <p className="text-muted mt-2">Email: {user?.email}</p>
              <p className="text-muted">WhatsApp: {user?.whatsapp}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-danger flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/products')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ShoppingBag className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Belanja Produk</h3>
                <p className="text-sm text-muted">Lihat koleksi produk kami</p>
              </div>
            </div>
          </div>

          <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/check-order')}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Cek Pesanan</h3>
                <p className="text-sm text-muted">Lihat status pesanan Anda</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Informasi Akun</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Nama:</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">WhatsApp:</span>
              <span className="font-medium">{user?.whatsapp}</span>
            </div>
            {user?.created_at && (
              <div className="flex justify-between">
                <span className="text-muted">Terdaftar:</span>
                <span className="font-medium">{new Date(user.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
