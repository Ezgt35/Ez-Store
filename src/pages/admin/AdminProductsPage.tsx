import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package } from 'lucide-react';
import type { Product, Category } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/shared/Skeleton';

export function AdminProductsPage() {
  const { showToast } = useToast();
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category_id: '',
    logo_url: '',
    banner_url: '',
    description: '',
    price: '',
    discount_percent: '0',
    stock: '-1',
    requires_server: false,
    is_active: true,
    is_popular: false,
    seo_title: '',
    meta_description: '',
  });

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchCategories();
    }
  }, [token]);

  const fetchProducts = async () => {
    if (!token) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'fetch_products' }),
    });
    const result = await response.json();
    if (response.ok && !result.error) {
      setProducts(result.products || []);
    } else {
      showToast('error', result.error || 'Gagal memuat produk');
      setProducts([]);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!token) {
      setCategories([]);
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'fetch_categories' }),
    });
    const result = await response.json();
    if (response.ok && !result.error) {
      setCategories(result.categories || []);
    } else {
      showToast('error', result.error || 'Gagal memuat kategori');
      setCategories([]);
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        slug: product.slug,
        category_id: product.category_id || '',
        logo_url: product.logo_url || '',
        banner_url: product.banner_url || '',
        description: product.description || '',
        price: product.price.toString(),
        discount_percent: product.discount_percent.toString(),
        stock: product.stock.toString(),
        requires_server: product.requires_server,
        is_active: product.is_active,
        is_popular: product.is_popular,
        seo_title: product.seo_title || '',
        meta_description: product.meta_description || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        category_id: '',
        logo_url: '',
        banner_url: '',
        description: '',
        price: '',
        discount_percent: '0',
        stock: '-1',
        requires_server: false,
        is_active: true,
        is_popular: false,
        seo_title: '',
        meta_description: '',
      });
    }
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      showToast('error', 'Nama dan harga harus diisi');
      return;
    }

    setSaving(true);

    const productData = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      category_id: formData.category_id || null,
      logo_url: formData.logo_url || null,
      banner_url: formData.banner_url || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      discount_percent: parseFloat(formData.discount_percent) || 0,
      stock: parseInt(formData.stock) || -1,
      requires_server: formData.requires_server,
      is_active: formData.is_active,
      is_popular: formData.is_popular,
      seo_title: formData.seo_title || null,
      meta_description: formData.meta_description || null,
    };

    try {
      if (!token) throw new Error('Unauthorized');
      const action = editingProduct ? 'product_update' : 'product_create';
      const payload = editingProduct
        ? { product: { id: editingProduct.id, ...productData } }
        : { product: productData };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, payload }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Gagal menyimpan produk');
      }

      showToast('success', editingProduct ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan');
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    if (!token) {
      showToast('error', 'Unauthorized');
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'product_update',
        payload: { product: { id: product.id, is_active: !product.is_active } },
      }),
    });
    const result = await response.json();

    if (response.ok && !result.error) {
      showToast('success', product.is_active ? 'Produk dinonaktifkan' : 'Produk diaktifkan');
      fetchProducts();
    } else {
      showToast('error', result.error || 'Gagal mengubah status');
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Yakin ingin menghapus "${product.name}"?`)) return;

    if (!token) {
      showToast('error', 'Unauthorized');
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'product_delete',
        payload: { productId: product.id },
      }),
    });
    const result = await response.json();

    if (response.ok && !result.error) {
      showToast('success', 'Produk berhasil dihapus');
      fetchProducts();
    } else {
      showToast('error', result.error || 'Gagal menghapus produk');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Produk</h1>
            <p className="text-muted">Kelola semua produk top up</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          </div>
        </div>

        {/* Products List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted">Produk</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Kategori</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Harga</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Stok</th>
                    <th className="text-left p-4 text-sm font-medium text-muted">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-border hover:bg-card/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.logo_url ? (
                            <img
                              src={product.logo_url}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {categories.find((c) => c.id === product.category_id)?.name || '-'}
                      </td>
                      <td className="p-4">
                        {product.discount_percent > 0 ? (
                          <div>
                            <p className="text-sm text-muted line-through">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="font-medium">
                              {formatCurrency(product.final_price)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium">{formatCurrency(product.price)}</p>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {product.stock === -1 ? 'Unlimited' : product.stock}
                      </td>
                      <td className="p-4">
                        <span className={`badge ${product.is_active ? 'badge-success' : 'badge-muted'}`}>
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(product)}
                            className="p-2 hover:bg-card rounded-lg"
                            title={product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {product.is_active ? (
                              <EyeOff className="w-4 h-4 text-muted" />
                            ) : (
                              <Eye className="w-4 h-4 text-primary" />
                            )}
                          </button>
                          <button
                            onClick={() => openModal(product)}
                            className="p-2 hover:bg-card rounded-lg"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product)}
                            className="p-2 hover:bg-card rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
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
              <Package className="w-16 h-16 mx-auto text-muted mb-4" />
              <p className="text-muted">Belum ada produk</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-background rounded-lg">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama Produk</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) });
                    }}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Slug URL</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Kategori</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Harga (Rp)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Diskon (%)</label>
                  <input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    className="input"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="label">Stok (-1 = Unlimited)</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="input"
                    placeholder="https://"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Banner URL</label>
                  <input
                    type="url"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    className="input"
                    placeholder="https://"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input min-h-[80px]"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_server}
                      onChange={(e) => setFormData({ ...formData, requires_server: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Memerlukan Server</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Aktif</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_popular}
                      onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Populer</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
