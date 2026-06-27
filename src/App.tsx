import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

// Layout
import { Navbar } from './components/shared/Navbar';
import { Footer } from './components/shared/Footer';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { InvoicePage } from './pages/InvoicePage';
import { CheckOrderPage } from './pages/CheckOrderPage';
import {
  FAQPage,
  AboutPage,
  ContactPage,
  PrivacyPolicyPage,
  TermsPage,
  NotFoundPage,
  ServerErrorPage,
} from './pages/AdditionalPages';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <AdminAuthProvider>
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/banners" element={<AdminBannersPage />} />
              <Route path="/admin/vouchers" element={<AdminVouchersPage />} />
              <Route path="/admin/admins" element={<AdminAdminsPage />} />

              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <PublicLayout>
                    <HomePage />
                  </PublicLayout>
                }
              />
              <Route
                path="/products"
                element={
                  <PublicLayout>
                    <ProductsPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/product/:slug"
                element={
                  <PublicLayout>
                    <ProductDetailPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/checkout"
                element={
                  <PublicLayout>
                    <CheckoutPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/invoice/:invoiceNumber"
                element={
                  <PublicLayout>
                    <InvoicePage />
                  </PublicLayout>
                }
              />
              <Route
                path="/check-order"
                element={
                  <PublicLayout>
                    <CheckOrderPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/faq"
                element={
                  <PublicLayout>
                    <FAQPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/about"
                element={
                  <PublicLayout>
                    <AboutPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <PublicLayout>
                    <ContactPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/privacy"
                element={
                  <PublicLayout>
                    <PrivacyPolicyPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/terms"
                element={
                  <PublicLayout>
                    <TermsPage />
                  </PublicLayout>
                }
              />
              <Route
                path="/500"
                element={
                  <PublicLayout>
                    <ServerErrorPage />
                  </PublicLayout>
                }
              />
              <Route
                path="*"
                element={
                  <PublicLayout>
                    <NotFoundPage />
                  </PublicLayout>
                }
              />
            </Routes>
          </AdminAuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

// Placeholder admin pages - to be implemented
function AdminSettingsPage() {
  return <AdminDashboardPlaceholder title="Pengaturan" description="Kelola pengaturan website" />;
}

function AdminBannersPage() {
  return <AdminDashboardPlaceholder title="Banner" description="Kelola banner promo" />;
}

function AdminVouchersPage() {
  return <AdminDashboardPlaceholder title="Voucher" description="Kelola kode promo" />;
}

function AdminAdminsPage() {
  return <AdminDashboardPlaceholder title="Admin" description="Kelola akun admin" />;
}

import { AdminLayout } from './components/admin/AdminLayout';

function AdminDashboardPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted">{description}</p>
        </div>
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl text-primary">?</span>
          </div>
          <p className="text-muted">Halaman ini sedang dikembangkan</p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default App;
