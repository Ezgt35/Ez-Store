import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Tags } from 'lucide-react';
import type { Category } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/shared/Skeleton';

export function AdminCategoriesPage() {
  const { showToast } = useToast();
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (token) {
      fetchCategories();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCategories = async () => {
    setLoading(true);
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify({ action: 'fetch_categories' }),
    });
    const result = await response.json();
    if (response.ok) {
      setCategories(result.categories || []);
    } else {
      showToast('error', result.error || 'Gagal memuat kategori');
    }
    setLoading(false);
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        icon: category.icon || '',
        description: category.description || '',
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        icon: '',
        description: '',
        sort_order: 0,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('error', 'Nama harus diisi');
      return;
    }

    setSaving(true);

    const categoryData = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      icon: formData.icon || null,
      description: formData.description || null,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };

    try {
      if (!token) throw new Error('Unauthorized');
      const action = editingCategory ? 'category_update' : 'category_create';
      const payload = editingCategory
        ? { category: { id: editingCategory.id, ...categoryData } }
        : { category: categoryData };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({ action, payload }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Gagal menyimpan kategori');
      }
      showToast('success', editingCategory ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan');

      setShowModal(false);
      fetchCategories();
    } catch (err) {
      showToast('error', 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: Category) => {
    if (!token) {
      showToast('error', 'Unauthorized');
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify({
        action: 'category_update',
        payload: { category: { id: category.id, is_active: !category.is_active } },
      }),
    });
    const result = await response.json();

    if (response.ok && !result.error) {
      showToast('success', category.is_active ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan');
      fetchCategories();
    } else {
      showToast('error', result.error || 'Gagal mengubah status');
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Yakin ingin menghapus "${category.name}"?`)) return;

    if (!token) {
      showToast('error', 'Unauthorized');
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify({
        action: 'category_delete',
        payload: { categoryId: category.id },
      }),
    });
    const result = await response.json();

    if (response.ok && !result.error) {
      showToast('success', 'Kategori berhasil dihapus');
      fetchCategories();
    } else {
      showToast('error', result.error || 'Gagal menghapus kategori');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kategori</h1>
            <p className="text-muted">Kelola kategori game</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Kategori
          </button>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <table className="w-full">
              <thead className="bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted">Nama</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Slug</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Urutan</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-muted">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border hover:bg-card/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                          <Tags className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted">{category.description || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted">{category.slug}</td>
                    <td className="p-4 text-sm">{category.sort_order}</td>
                    <td className="p-4">
                      <span className={`badge ${category.is_active ? 'badge-success' : 'badge-muted'}`}>
                        {category.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggleActive(category)} className="p-2 hover:bg-card rounded-lg">
                          {category.is_active ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-primary" />}
                        </button>
                        <button onClick={() => openModal(category)} className="p-2 hover:bg-card rounded-lg">
                          <Edit className="w-4 h-4 text-primary" />
                        </button>
                        <button onClick={() => deleteCategory(category)} className="p-2 hover:bg-card rounded-lg">
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Tags className="w-16 h-16 mx-auto text-muted mb-4" />
              <p className="text-muted">Belum ada kategori</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nama</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Icon Name</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="input"
                  placeholder="smartphone, gamepad-2, etc."
                />
              </div>

              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div>
                <label className="label">Urutan</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="input"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Aktif</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
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
