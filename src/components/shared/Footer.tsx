import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, Gamepad2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="bg-card/50 border-t border-border">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name} className="h-8 w-auto" />
              ) : (
                <>
                  <Gamepad2 className="w-8 h-8 text-primary" />
                  <span className="text-xl font-bold text-gradient">{settings.site_name}</span>
                </>
              )}
            </Link>
            <p className="text-sm text-muted mb-4">{settings.site_tagline}</p>
            <div className="flex items-center gap-3">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {settings.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Menu</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-sm text-muted hover:text-white transition-colors">
                  Semua Produk
                </Link>
              </li>
              <li>
                <Link to="/check-order" className="text-sm text-muted hover:text-white transition-colors">
                  Cek Pesanan
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Informasi</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted hover:text-white transition-colors">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted hover:text-white transition-colors">
                  Hubungi Kami
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted hover:text-white transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted hover:text-white transition-colors">
                  Syarat & Ketentuan
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Kontak</h3>
            <ul className="space-y-3">
              <li>
                <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  {settings.contact_email}
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${settings.contact_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  {settings.contact_whatsapp}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted">{settings.footer_text}</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-xs text-muted hover:text-white transition-colors">
                Privasi
              </Link>
              <Link to="/terms" className="text-xs text-muted hover:text-white transition-colors">
                Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
