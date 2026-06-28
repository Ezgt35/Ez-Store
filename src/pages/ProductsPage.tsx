import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product, Category } from '../lib/supabase';
import { ProductCard } from '../components/shared/ProductCard';
import { ProductCardSkeleton } from '../components/shared/Skeleton';

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const itemsPerPage = 12;

  const selectedCategory = searchParams.get('category');
  const sortBy = searchParams.get('sort') || 'popular';

  const sanitizeSearchQuery = (value: string) =>
    value
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');

  useEffect(() => {
    const fetchCategories = async () => {
      if (!isSupabaseConfigured) {
        setCategories([]);
        return;
      }

      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          setProducts([]);
          setTotalProducts(0);
          return;
        }
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('is_active', true);

        if (selectedCategory) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', selectedCategory)
            .maybeSingle();
          if (categoryData) {
            query = query.eq('category_id', categoryData.id);
          }
        }

        const safeSearchQuery = sanitizeSearchQuery(searchQuery);
        if (safeSearchQuery) {
          query = query.or(`name.ilike.%${safeSearchQuery}%,description.ilike.%${safeSearchQuery}%`);
        }

        switch (sortBy) {
          case 'price-low':
            query = query.order('final_price', { ascending: true });
            break;
          case 'price-high':
            query = query.order('final_price', { ascending: false });
            break;
          case 'name':
            query = query.order('name', { ascending: true });
            break;
          case 'popular':
          default:
            query = query.order('is_popular', { ascending: false }).order('sort_order');
        }

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);

        const { data, count } = await query;

        setProducts(data || []);
        setTotalProducts(count || 0);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, sortBy, searchQuery, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    const safeSearchQuery = sanitizeSearchQuery(searchQuery);
    if (safeSearchQuery) {
      params.set('search', safeSearchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (slug: string | null) => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <main className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Semua Produk</h1>
        <p className="text-muted">Temukan game favoritmu dan top up dengan mudah</p>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            </div>
          </form>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="input w-full lg:w-48"
          >
            <option value="popular">Paling Populer</option>
            <option value="name">Nama A-Z</option>
            <option value="price-low">Harga Terendah</option>
            <option value="price-high">Harga Tertinggi</option>
          </select>
        </div>

        {/* Categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`badge cursor-pointer ${
              !selectedCategory ? 'badge-primary' : 'badge-muted hover:badge-primary'
            }`}
          >
            Semua
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.slug)}
              className={`badge cursor-pointer ${
                selectedCategory === category.slug ? 'badge-primary' : 'badge-muted hover:badge-primary'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <p className="text-sm text-muted mb-4">
            Menampilkan {products.length} dari {totalProducts} produk
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary py-2 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn py-2 px-4 ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary py-2 px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted mb-4" />
          <h3 className="text-xl font-semibold mb-2">Tidak ada produk</h3>
          <p className="text-muted mb-4">
            Tidak ada produk yang ditemukan
            {searchQuery && ` untuk "${searchQuery}"`}
          </p>
          <button onClick={() => setSearchQuery('')} className="btn-primary">
            Reset Pencarian
          </button>
        </div>
      )}
    </main>
  );
}
