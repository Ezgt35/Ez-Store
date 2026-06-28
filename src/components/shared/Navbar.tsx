import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Gamepad2, LogOut, User } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useUserAuth } from '../../context/UserAuthContext';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, logout, isAuthenticated } = useUserAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Cek Pesanan', path: '/check-order' },
    { name: 'FAQ', path: '/faq' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-40 glass">
      <nav className="container-custom py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="h-8 w-auto" />
            ) : (
              <>
                <Gamepad2 className="w-8 h-8 text-primary group-hover:text-secondary transition-colors" />
                <span className="text-xl font-bold text-gradient">{settings.site_name}</span>
              </>
            )}
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-muted hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Cari game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-64 py-2 pl-10 pr-4 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            </form>
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-white">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-4">
                Login
              </Link>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 animate-fade-in">
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                placeholder="Cari game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full py-2 pl-10 pr-4 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            </form>
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-medium transition-colors py-2 ${
                    location.pathname === link.path
                      ? 'text-primary'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-border">
                {isAuthenticated && user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-white">{user.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                        setIsOpen(false);
                      }}
                      className="btn-secondary w-full text-sm py-2 px-4 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/login" 
                    className="btn-primary w-full text-sm py-2 px-4 flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
