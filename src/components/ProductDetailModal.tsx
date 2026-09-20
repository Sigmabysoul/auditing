import React from 'react';
import type { ProductWithAggregateStock, Category, Warehouse, WarehouseStock } from '../types';
import {
  X,
  Building2,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  ClipboardCheck,
  Info
} from 'lucide-react';
import { getProductPlaceholderSvg, triggerHaptic } from '../utils/imageUtils';

interface ProductDetailModalProps {
  product: ProductWithAggregateStock;
  category?: Category;
  warehouses: Warehouse[];
  onClose: () => void;
  onEditProduct: (product: ProductWithAggregateStock) => void;
  onDeleteProduct: (productId: string) => void;
  onSelectWarehouseForAudit: (product: ProductWithAggregateStock, warehouse: Warehouse, stock?: WarehouseStock) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  category,
  warehouses,
  onClose,
  onEditProduct,
  onDeleteProduct,
  onSelectWarehouseForAudit,
}) => {
  const imageSrc = product.image || getProductPlaceholderSvg(product.name, category?.color || '#3b82f6');

  // Map stocks by warehouseId for quick lookup
  const stockMap = React.useMemo(() => {
    const map = new Map<string, WarehouseStock>();
    product.stocks.forEach((s) => {
      map.set(s.warehouseId, s);
    });
    return map;
  }, [product.stocks]);

  const totalVariance = product.stocks.reduce((acc, s) => acc + (s.variance || 0), 0);

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Never audited';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Drawer Sheet */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700/80 rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 flex-shrink-0" />

        {/* Header Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: category?.color || '#3b82f6' }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {category?.name || 'Uncategorized'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onEditProduct(product);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition"
              title="Edit Product"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('warning');
                if (window.confirm(`Delete "${product.name}" and all its warehouse records?`)) {
                  onDeleteProduct(product.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 active:scale-95 transition"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Hero Banner: Image & Product Details */}
          <div className="flex items-start gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
              <img
                src={imageSrc}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white leading-tight">
                {product.name}
              </h2>

              {product.sku && (
                <div className="text-xs font-mono text-emerald-400 mt-1">
                  SKU: {product.sku}
                </div>
              )}

              {product.details ? (
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                  {product.details}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic mt-1.5">
                  No extra details provided.
                </p>
              )}
            </div>
          </div>

          {/* Aggregated Stock Numbers KPI */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Total Stock
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {product.totalStock}
              </div>
              <span className="text-[10px] text-slate-400">{product.unit}</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Audit Stock
              </span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                {product.totalAuditStock}
              </div>
              <span className="text-[10px] text-slate-400">{product.unit}</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Net Variance
              </span>
              <div
                className={`text-xl font-bold font-mono mt-0.5 ${
                  totalVariance === 0
                    ? 'text-slate-300'
                    : totalVariance > 0
                    ? 'text-blue-400'
                    : 'text-rose-400'
                }`}
              >
                {totalVariance > 0 ? `+${totalVariance}` : totalVariance}
              </div>
              <span className="text-[10px] text-slate-400">
                {totalVariance === 0 ? 'Exact match' : totalVariance > 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
          </div>

          {/* DIVISION OF STOCK FOR ALL WAREHOUSES (Core Requirement) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Division of Stock by Warehouse</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tap any warehouse below to perform an audit on this item
                </p>
              </div>
            </div>

            {warehouses.length === 0 ? (
              <div className="p-6 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No warehouses registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {warehouses.map((wh) => {
                  const stock = stockMap.get(wh.id);
                  const stockNumber = stock?.stockNumber ?? 0;
                  const auditNumber = stock?.auditNumber ?? stockNumber;
                  const variance = stock?.variance ?? 0;
                  const lastAudited = stock?.lastAuditedAt;

                  return (
                    <div
                      key={wh.id}
                      onClick={() => {
                        triggerHaptic('medium');
                        onSelectWarehouseForAudit(product, wh, stock);
                      }}
                      className="group relative bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700/80 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-3.5 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Warehouse info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-700 text-emerald-400 border border-slate-600">
                              {wh.code}
                            </span>
                            <span className="text-sm font-bold text-white truncate">
                              {wh.name}
                            </span>
                          </div>

                          {wh.description && (
                            <p className="text-[11px] text-slate-400 truncate mb-1">
                              {wh.description}
                            </p>
                          )}

                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(lastAudited)}</span>
                            {stock?.notes && (
                              <span className="truncate max-w-[140px] text-amber-300/80 italic ml-1">
                                • {stock.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock & Audit numbers */}
                        <div className="flex items-center gap-3">
                          {/* Stock Numbers breakdown */}
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <span className="text-slate-400 text-[11px]">Stock:</span>
                              <span className="font-mono font-semibold text-slate-200">
                                {stockNumber}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-2 text-xs mt-0.5">
                              <span className="text-emerald-400 text-[11px] font-medium">Audit:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                {auditNumber} {product.unit}
                              </span>
                            </div>

                            {/* Variance pill */}
                            <div className="mt-1 flex justify-end">
                              {variance === 0 ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  ±0 Match
                                </span>
                              ) : variance < 0 ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  {variance} Short
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  +{variance} Extra
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Audit Button */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-slate-950 transition-colors">
                            <ClipboardCheck className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar Info */}
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 safe-bottom">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tap any warehouse above to begin audit</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
