import { Link } from 'react-router-dom';
import { Package, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/supabase';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [liveProduct, setLiveProduct] = useState(product);
  const hasDiscount = liveProduct.discount_percent > 0;
  const isOutOfStock = liveProduct.stock === 0;

  useEffect(() => {
    setLiveProduct(product);
  }, [product]);

  useEffect(() => {
    const subscription = supabase
      .channel(`product-card-${liveProduct.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${liveProduct.id}` },
        (payload) => {
          setLiveProduct((current) => ({ ...current, ...(payload.new as Product) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [liveProduct.id]);

  return (
    <Link to={`/product/${product.slug}`} className="block">
      <div className="card-interactive group overflow-hidden">
        <div className="relative aspect-video bg-background rounded-lg overflow-hidden mb-4">
          {liveProduct.logo_url ? (
            <img
              src={liveProduct.logo_url}
              alt={liveProduct.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20">
              <Package className="w-12 h-12 text-muted" />
            </div>
          )}
          {hasDiscount && (
            <span className="absolute top-2 right-2 badge-error">
              -{liveProduct.discount_percent}%
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="badge-muted">Stok Habis</span>
            </div>
          )}
          {liveProduct.is_popular && !isOutOfStock && (
            <span className="absolute top-2 left-2 badge-primary">Populer</span>
          )}
        </div>

        <h3 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {liveProduct.name}
        </h3>

        <p className="text-sm text-muted mb-3 line-clamp-2">{liveProduct.description}</p>

        <div className="flex items-center justify-between">
          <div>
            {hasDiscount ? (
              <>
                <p className="text-xs text-muted line-through">
                  Rp {liveProduct.price.toLocaleString('id-ID')}
                </p>
                <p className="text-lg font-bold text-primary">
                  Rp {liveProduct.final_price.toLocaleString('id-ID')}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-white">
                Rp {liveProduct.price.toLocaleString('id-ID')}
              </p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary transition-colors">
            <ShoppingCart className="w-4 h-4 text-primary group-hover:text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
