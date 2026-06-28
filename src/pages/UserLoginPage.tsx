import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, LogIn, Chrome } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function UserLoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, loading: authLoading } = useUserAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authLoading && isAuthenticated) {
    navigate('/user/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        showToast('success', 'Login berhasil');
        navigate('/user/dashboard');
      } else {
        setError(result.error || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        setError(result.error || 'Gagal memulai login Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <LogIn className="w-10 h-10 text-primary" />
              <span className="text-2xl font-bold text-gradient">Ez-Store</span>
            </Link>
            <p className="text-muted mt-2">Masuk ke akun Anda</p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input pl-10"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="input pl-10"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">atau</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Chrome className="w-4 h-4" />
            {googleLoading ? 'Memproses...' : 'Masuk dengan Google'}
          </button>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted mb-2">Belum punya akun?</p>
            <Link to="/" className="text-sm text-primary hover:underline">
              Kembali ke Website
            </Link>
          </div>
        </div>

        <p className="text-center text-muted text-sm mt-4">
          Login dengan email dan password Anda
        </p>
      </div>
    </main>
  );
}
