import { Link } from 'react-router-dom';
import { Smartphone, Gamepad2, Flame, Sparkles, Crosshair, Zap, Gift, Crown } from 'lucide-react';
import type { Category } from '../../lib/supabase';

interface CategoryCardProps {
  category: Category;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'smartphone': Smartphone,
  'gamepad-2': Gamepad2,
  'flame': Flame,
  'sparkles': Sparkles,
  'crosshair': Crosshair,
  'zap': Zap,
  'gift': Gift,
  'crown': Crown,
};

export function CategoryCard({ category }: CategoryCardProps) {
  const IconComponent = category.icon ? iconMap[category.icon] || Gamepad2 : Gamepad2;

  return (
    <Link to={`/products?category=${category.slug}`}>
      <div className="card-interactive text-center group">
        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
          <IconComponent className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-medium text-white group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-xs text-muted mt-1 line-clamp-1">{category.description}</p>
        )}
      </div>
    </Link>
  );
}
