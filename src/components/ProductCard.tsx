import React from 'react';
import type { ProductWithAggregateStock, Category, Warehouse } from '../types';
import { ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Clock, Building2 } from 'lucide-react';
import { getProductPlaceholderSvg, triggerHaptic } from '../utils/imageUtils';

interface ProductCardProps {
  product: ProductWithAggregateStock;
  category?: Category;
  selectedWarehouse?: Warehouse;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  selectedWarehouse,
  onClick,
}) => {
  const imageSrc = product.image || getProductPlaceholderSvg(product.name, category?.color || '#3b82f6');

  // Stock and audit numbers depending on whether a warehouse is selected
  const warehouseStock = selectedWarehouse
    ? product.stocks.find((s) => s.warehouseId === selectedWarehouse.id)
    : null;

  const displayStock = warehouseStock
    ? (warehouseStock.auditNumber ?? warehouseStock.stockNumber ?? 0)
    : product.totalStock;

  const displayVariance = warehouseStock
    ? (warehouseStock.variance ?? 0)
    : product.stocks.reduce((acc, s) => acc + (s.variance || 0), 0);

  const displayLastAudited = warehouseStock?.lastAuditedAt || product.lastAuditedAt;

  const isLowStock = product.minStockThreshold !== undefined && displayStock <= product.minStockThreshold;

  // Format last audited time
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Needs Audit (Never)';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Audited just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 30) return `Audited ${diffDays}d ago (Needs check)`;
    return `${diffDays}d ago`;
  };

  const isAuditUrgent = !displayLastAudited || (new Date().getTime() - new Date(displayLastAudited).getTime()) > 1000 * 60 * 60 * 24 * 14;

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className="group relative bg-slate-900/80 light:bg-white hover:bg-slate-850 light:hover:bg-slate-50 active:bg-slate-800/90 border border-slate-800/90 light:border-slate-200 hover:border-slate-700/80 light:hover:border-emerald-500/40 rounded-3xl p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between gap-3.5"
    >
      {/* Top Row: Image, Category, Title, Chevron */}
      <div className="flex items-start gap-3.5">
        {/* Product Image */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-800 light:bg-slate-100 flex-shrink-0 border border-slate-700/50 light:border-slate-200 shadow-inner">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {isLowStock && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-bold uppercase tracking-wider shadow">
              Low
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            {/* Category badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{
                backgroundColor: `${category?.color || '#3b82f6'}15`,
                borderColor: `${category?.color || '#3b82f6'}40`,
                color: category?.color || '#2563eb',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category?.color || '#3b82f6' }}
              />
              <span className="truncate max-w-[130px]">{category?.name || 'General'}</span>
            </span>

            {/* Warehouse context indicator */}
            {selectedWarehouse ? (
              <span className="text-[10px] font-mono font-bold text-emerald-400 light:text-emerald-700 bg-emerald-500/10 light:bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{selectedWarehouse.code}</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 light:text-slate-500 font-medium bg-slate-800/80 light:bg-slate-100 px-2 py-0.5 rounded-md border border-slate-700/50 light:border-slate-200">
                {product.warehousesCount} {product.warehousesCount === 1 ? 'room' : 'rooms'}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white light:text-slate-900 tracking-tight leading-snug line-clamp-2">
            {product.name}
          </h3>

          {product.sku && (
            <p className="text-xs font-mono text-slate-400 light:text-slate-500 mt-0.5 font-medium">
              SKU: {product.sku}
            </p>
          )}

          {product.details && (
            <p className="text-xs text-slate-400 light:text-slate-600 line-clamp-1 mt-1 italic">
              {product.details}
            </p>
          )}
        </div>

        {/* Action arrow */}
        <div className="self-center p-1 rounded-xl text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>

      {/* Bottom Row: Stock count & Last Audit Date indicator */}
      <div className="pt-2.5 border-t border-slate-800/80 light:border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        {/* Stock Highlight */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-500 block">
            {selectedWarehouse ? `${selectedWarehouse.name} Stock` : 'Total Stock (All Rooms)'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 light:text-emerald-600 font-mono tracking-tight leading-none">
              {displayStock}
            </span>
            <span className="text-xs text-slate-400 light:text-slate-600 font-medium">
              {product.unit}
            </span>
          </div>
        </div>

        {/* Audit Status & Last Audit Date */}
        <div className="flex flex-col items-end">
          {displayVariance === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/20 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matched</span>
            </span>
          ) : displayVariance < 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/15 light:bg-rose-50 text-rose-400 light:text-rose-700 border border-rose-500/30 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{displayVariance} shortage</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-500/15 light:bg-blue-50 text-blue-400 light:text-blue-700 border border-blue-500/30 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{displayVariance} surplus</span>
            </span>
          )}

          <div
            className={`flex items-center gap-1 text-[11px] font-medium mt-1.5 ${
              isAuditUrgent
                ? 'text-amber-400 light:text-amber-600 font-semibold'
                : 'text-slate-400 light:text-slate-500'
            }`}
          >
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{formatTimeAgo(displayLastAudited)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
