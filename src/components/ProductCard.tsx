import React from 'react';
import type { ProductWithAggregateStock, Category } from '../types';
import { ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { getProductPlaceholderSvg, triggerHaptic } from '../utils/imageUtils';

interface ProductCardProps {
  product: ProductWithAggregateStock;
  category?: Category;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  onClick,
}) => {
  const imageSrc = product.image || getProductPlaceholderSvg(product.name, category?.color || '#3b82f6');

  // Calculate total variance across warehouses
  const totalVariance = product.stocks.reduce((acc, s) => acc + (s.variance || 0), 0);
  const isLowStock = product.minStockThreshold !== undefined && product.totalStock <= product.minStockThreshold;

  // Format last audited time
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Not yet audited';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Audited just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className="group relative bg-slate-900/80 hover:bg-slate-850 active:bg-slate-800/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3.5 shadow-sm active:scale-[0.985] transition-all cursor-pointer flex flex-col gap-3"
    >
      {/* Top Row: Image, Category, Title, Chevron */}
      <div className="flex items-start gap-3">
        {/* Product Image */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700/50">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {isLowStock && (
            <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-rose-500/90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
              Low
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            {/* Category badge */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                backgroundColor: `${category?.color || '#3b82f6'}15`,
                borderColor: `${category?.color || '#3b82f6'}40`,
                color: category?.color || '#60a5fa',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: category?.color || '#3b82f6' }}
              />
              <span className="truncate max-w-[120px]">{category?.name || 'Uncategorized'}</span>
            </span>

            {/* Warehouse count chip */}
            <span className="text-[10px] text-slate-400 font-medium bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
              {product.warehousesCount} {product.warehousesCount === 1 ? 'room' : 'rooms'}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-white tracking-tight leading-snug line-clamp-2">
            {product.name}
          </h3>

          {product.sku && (
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              SKU: {product.sku}
            </p>
          )}
        </div>

        {/* Action arrow */}
        <div className="self-center p-1 rounded-lg text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>

      {/* Bottom Row: Total Stock highlight & Audit status */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Total Stock */}
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
            Total Stock (All Rooms)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-emerald-400 font-mono tracking-tight leading-none">
              {product.totalStock}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {product.unit}
            </span>
          </div>
        </div>

        {/* Audit Status Badge */}
        <div className="flex flex-col items-end">
          {totalVariance === 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matched</span>
            </span>
          ) : totalVariance < 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{totalVariance} shortage</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{totalVariance} surplus</span>
            </span>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(product.lastAuditedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
