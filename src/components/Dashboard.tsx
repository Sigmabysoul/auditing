import React, { useState, useMemo } from 'react';
import type { ProductWithAggregateStock, Category, Warehouse } from '../types';
import { ProductCard } from './ProductCard';
import {
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  Building2,
  AlertCircle,
  SlidersHorizontal,
  Package,
  Layers,
  ArrowDown10,
  ArrowUp01,
  X,
  Plus,
} from 'lucide-react';
import { triggerHaptic } from '../utils/imageUtils';

export type SortField =
  | 'name-asc'
  | 'name-desc'
  | 'audit-recent'
  | 'audit-oldest'
  | 'stock-high'
  | 'stock-low'
  | 'warehouse-stock';

export type AuditFilterOption = 'all' | 'needs-audit' | 'discrepancy' | 'low-stock';

interface DashboardProps {
  products: ProductWithAggregateStock[];
  categories: Category[];
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  onSelectProduct: (product: ProductWithAggregateStock) => void;
  onOpenNewProduct: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  categories,
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  onSelectProduct,
  onOpenNewProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<AuditFilterOption>('all');
  const [sortField, setSortField] = useState<SortField>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId);
  }, [warehouses, selectedWarehouseId]);

  // Overall KPI metrics
  const totalStockSum = useMemo(() => {
    if (selectedWarehouse) {
      return products.reduce((acc, p) => {
        const stock = p.stocks.find((s) => s.warehouseId === selectedWarehouse.id);
        return acc + (stock?.auditNumber ?? stock?.stockNumber ?? 0);
      }, 0);
    }
    return products.reduce((acc, p) => acc + p.totalStock, 0);
  }, [products, selectedWarehouse]);

  const discrepanciesCount = useMemo(() => {
    return products.filter((p) => p.hasDiscrepancy).length;
  }, [products]);

  const needsAuditCount = useMemo(() => {
    const fourteenDaysAgo = new Date().getTime() - 1000 * 60 * 60 * 24 * 14;
    return products.filter((p) => {
      const last = selectedWarehouse
        ? p.stocks.find((s) => s.warehouseId === selectedWarehouse.id)?.lastAuditedAt
        : p.lastAuditedAt;
      if (!last) return true;
      return new Date(last).getTime() < fourteenDaysAgo;
    }).length;
  }, [products, selectedWarehouse]);

  // Filtered and Sorted Products
  const processedProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
          const matchDetails = p.details ? p.details.toLowerCase().includes(q) : false;
          if (!matchName && !matchSku && !matchDetails) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
          return false;
        }

        // Audit state filter (User request: "some filter so the user can see what need to do auditing off")
        if (auditFilter === 'needs-audit') {
          const fourteenDaysAgo = new Date().getTime() - 1000 * 60 * 60 * 24 * 14;
          const last = selectedWarehouse
            ? p.stocks.find((s) => s.warehouseId === selectedWarehouse.id)?.lastAuditedAt
            : p.lastAuditedAt;
          if (!last) return true;
          if (new Date(last).getTime() >= fourteenDaysAgo) return false;
        }

        if (auditFilter === 'discrepancy' && !p.hasDiscrepancy) {
          return false;
        }

        if (auditFilter === 'low-stock') {
          const currentStock = selectedWarehouse
            ? (p.stocks.find((s) => s.warehouseId === selectedWarehouse.id)?.auditNumber ?? 0)
            : p.totalStock;
          if (p.minStockThreshold === undefined || currentStock > p.minStockThreshold) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Alphabetical
        if (sortField === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortField === 'name-desc') {
          return b.name.localeCompare(a.name);
        }

        // 2. Last Audited
        if (sortField === 'audit-recent') {
          const timeA = a.lastAuditedAt ? new Date(a.lastAuditedAt).getTime() : 0;
          const timeB = b.lastAuditedAt ? new Date(b.lastAuditedAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortField === 'audit-oldest') {
          const timeA = a.lastAuditedAt ? new Date(a.lastAuditedAt).getTime() : 0;
          const timeB = b.lastAuditedAt ? new Date(b.lastAuditedAt).getTime() : 0;
          return timeA - timeB;
        }

        // 3. Stock quantity
        if (sortField === 'stock-high') {
          const sA = selectedWarehouse ? (a.stocks.find(s => s.warehouseId === selectedWarehouse.id)?.auditNumber ?? 0) : a.totalStock;
          const sB = selectedWarehouse ? (b.stocks.find(s => s.warehouseId === selectedWarehouse.id)?.auditNumber ?? 0) : b.totalStock;
          return sB - sA;
        }
        if (sortField === 'stock-low') {
          const sA = selectedWarehouse ? (a.stocks.find(s => s.warehouseId === selectedWarehouse.id)?.auditNumber ?? 0) : a.totalStock;
          const sB = selectedWarehouse ? (b.stocks.find(s => s.warehouseId === selectedWarehouse.id)?.auditNumber ?? 0) : b.totalStock;
          return sA - sB;
        }

        return 0;
      });
  }, [products, searchQuery, selectedCategory, auditFilter, sortField, selectedWarehouse]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3 sm:px-6 pt-4">
      {/* KPI Stats Bar - Responsive on Desktop/Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400 light:text-slate-500">
            <Package className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
            <span>Products</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white light:text-slate-900 mt-1">
            {products.length}
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500">Tracked items</span>
        </div>

        <div className="bg-slate-900/90 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400 light:text-slate-500">
            <Layers className="w-4 h-4 text-cyan-400 light:text-cyan-600" />
            <span>{selectedWarehouse ? `${selectedWarehouse.code} Units` : 'Total Units'}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 light:text-cyan-600 mt-1">
            {totalStockSum}
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500">
            {selectedWarehouse ? `In ${selectedWarehouse.name}` : 'Across all rooms'}
          </span>
        </div>

        {/* Needs Audit Filter KPI */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setAuditFilter((prev) => (prev === 'needs-audit' ? 'all' : 'needs-audit'));
          }}
          className={`border rounded-3xl p-4 shadow-sm cursor-pointer transition active:scale-95 ${
            auditFilter === 'needs-audit'
              ? 'bg-amber-500/20 light:bg-amber-100 border-amber-500/50 light:border-amber-400 text-amber-300 light:text-amber-800'
              : 'bg-slate-900/90 light:bg-white border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-amber-400 light:text-amber-600">
            <Clock className="w-4 h-4" />
            <span>Needs Audit</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 light:text-amber-600 mt-1">
            {needsAuditCount}
          </div>
          <span className="text-[11px]">Never or &gt;14d unchecked</span>
        </div>

        {/* Discrepancy Filter KPI */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setAuditFilter((prev) => (prev === 'discrepancy' ? 'all' : 'discrepancy'));
          }}
          className={`border rounded-3xl p-4 shadow-sm cursor-pointer transition active:scale-95 ${
            auditFilter === 'discrepancy'
              ? 'bg-rose-500/20 light:bg-rose-100 border-rose-500/50 light:border-rose-400 text-rose-300 light:text-rose-800'
              : 'bg-slate-900/90 light:bg-white border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-rose-400 light:text-rose-600">
            <AlertCircle className="w-4 h-4" />
            <span>Discrepancies</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400 light:text-rose-600 mt-1">
            {discrepanciesCount}
          </div>
          <span className="text-[11px]">Variance detected</span>
        </div>
      </div>

      {/* Warehouse Banner (when a warehouse is active) */}
      {selectedWarehouse && (
        <div className="bg-emerald-500/10 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-300 rounded-2xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
            <span className="text-xs font-bold text-white light:text-slate-900">
              Filtering by: <span className="text-emerald-400 light:text-emerald-700 font-mono">[{selectedWarehouse.code}]</span> {selectedWarehouse.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectWarehouse('all')}
            className="text-xs text-emerald-400 light:text-emerald-700 hover:underline font-semibold"
          >
            Show All Warehouses
          </button>
        </div>
      )}

      {/* Search Bar, Fast Audit Filters & Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 light:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, SKU or rack location..."
            className="w-full bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white light:hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Audit Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAuditFilter('all');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              auditFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white'
            }`}
          >
            All Items
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAuditFilter('needs-audit');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              auditFilter === 'needs-audit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-amber-400 light:text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Needs Audit ({needsAuditCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAuditFilter('discrepancy');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              auditFilter === 'discrepancy'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-rose-400 light:text-rose-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Shortages ({discrepanciesCount})</span>
          </button>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowSortSheet(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 light:bg-white hover:bg-slate-800 light:hover:bg-slate-100 border border-slate-800 light:border-slate-200 text-slate-200 light:text-slate-800 text-xs font-bold active:scale-95 transition shadow-sm whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sort</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills (Horizontal scrolling) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSelectedCategory('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-slate-800 light:bg-slate-200 text-white light:text-slate-900 shadow-sm'
              : 'bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white'
          }`}
        >
          All Categories ({products.length})
        </button>

        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-shrink-0 flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-800 light:bg-slate-200 text-white light:text-slate-900 border-slate-600 light:border-slate-300 shadow-sm'
                  : 'bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Product Grid / Desktop Responsive (1 col on mobile, 2 on tablet, 3 on desktop) */}
      {processedProducts.length === 0 ? (
        <div className="p-10 text-center bg-slate-900/60 light:bg-white rounded-3xl border border-slate-800/80 light:border-slate-200 space-y-4 my-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 light:bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white light:text-slate-900">No warehouse items found</h3>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || auditFilter !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your search query or clear the active filter.'
                : 'Your database is completely clean! Add your first real warehouse product to begin tracking.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-md transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {processedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={categoryMap.get(product.categoryId)}
              selectedWarehouse={selectedWarehouse}
              onClick={() => onSelectProduct(product)}
            />
          ))}
        </div>
      )}

      {/* SORT BOTTOM SHEET / MODAL */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowSortSheet(false)} />

          <div className="relative z-10 w-full max-w-lg bg-slate-900 light:bg-white border border-slate-700 light:border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Sort Products</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSortSheet(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('name-asc');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'name-asc'
                    ? 'bg-emerald-500/20 text-emerald-400 light:text-emerald-700 border-emerald-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <ArrowDownAZ className="w-4 h-4" />
                <span>Name (A &rarr; Z)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('name-desc');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'name-desc'
                    ? 'bg-emerald-500/20 text-emerald-400 light:text-emerald-700 border-emerald-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <ArrowUpAZ className="w-4 h-4" />
                <span>Name (Z &rarr; A)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('audit-oldest');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'audit-oldest'
                    ? 'bg-amber-500/20 text-amber-400 light:text-amber-800 border-amber-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Needs Audit First</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('audit-recent');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'audit-recent'
                    ? 'bg-emerald-500/20 text-emerald-400 light:text-emerald-700 border-emerald-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Recent Audits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('stock-high');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'stock-high'
                    ? 'bg-emerald-500/20 text-emerald-400 light:text-emerald-700 border-emerald-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <ArrowDown10 className="w-4 h-4" />
                <span>Highest Stock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSortField('stock-low');
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  sortField === 'stock-low'
                    ? 'bg-rose-500/20 text-rose-400 light:text-rose-700 border-rose-500/50'
                    : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700/80 light:border-slate-200'
                }`}
              >
                <ArrowUp01 className="w-4 h-4 text-rose-400" />
                <span>Lowest Stock</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSortSheet(false)}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Apply Sorting
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
