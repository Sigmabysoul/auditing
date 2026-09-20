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
  X
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

interface DashboardProps {
  products: ProductWithAggregateStock[];
  categories: Category[];
  warehouses: Warehouse[];
  onSelectProduct: (product: ProductWithAggregateStock) => void;
  onOpenNewProduct: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  categories,
  warehouses,
  onSelectProduct,
  onOpenNewProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name-asc');
  const [sortWarehouseId, setSortWarehouseId] = useState<string>('all');
  const [filterDiscrepancyOnly, setFilterDiscrepancyOnly] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);

  // Overall KPI metrics
  const totalStockSum = useMemo(() => {
    return products.reduce((acc, p) => acc + p.totalStock, 0);
  }, [products]);

  const discrepanciesCount = useMemo(() => {
    return products.filter((p) => p.hasDiscrepancy).length;
  }, [products]);

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

        // Discrepancy filter
        if (filterDiscrepancyOnly && !p.hasDiscrepancy) {
          return false;
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

        // 3. Overall Stock quantity
        if (sortField === 'stock-high') {
          return b.totalStock - a.totalStock;
        }
        if (sortField === 'stock-low') {
          return a.totalStock - b.totalStock;
        }

        // 4. Warehouse specific stock
        if (sortField === 'warehouse-stock' && sortWarehouseId !== 'all') {
          const stockA = a.stocks.find((s) => s.warehouseId === sortWarehouseId)?.auditNumber ?? 0;
          const stockB = b.stocks.find((s) => s.warehouseId === sortWarehouseId)?.auditNumber ?? 0;
          return stockB - stockA; // Highest in this warehouse first
        }

        return 0;
      });
  }, [products, searchQuery, selectedCategory, sortField, sortWarehouseId, filterDiscrepancyOnly]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const activeWarehouseName = useMemo(() => {
    if (sortWarehouseId === 'all') return 'All Warehouses';
    return warehouses.find((w) => w.id === sortWarehouseId)?.name || 'Selected Warehouse';
  }, [warehouses, sortWarehouseId]);

  return (
    <div className="space-y-3 pb-24 max-w-2xl mx-auto px-4 pt-3">
      {/* Quick KPI Stats Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
            <Package className="w-3 h-3 text-emerald-400" />
            <span>Products</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {products.length}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Total Units</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
            {totalStockSum}
          </div>
        </div>

        <div
          onClick={() => {
            triggerHaptic('light');
            setFilterDiscrepancyOnly(!filterDiscrepancyOnly);
          }}
          className={`border rounded-2xl p-2.5 shadow-sm cursor-pointer transition ${
            discrepanciesCount > 0
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              : 'bg-slate-900/90 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Variance Alert</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
            {discrepanciesCount}
          </div>
        </div>
      </div>

      {/* Search Bar & Sort Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, SKU or rack..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & Warehouse Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowSortSheet(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold active:scale-95 transition shadow-sm"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sort & Filter</span>
        </button>
      </div>

      {/* Active Sort / Warehouse Indicator Badge */}
      {(sortField !== 'name-asc' || sortWarehouseId !== 'all' || filterDiscrepancyOnly) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {sortField !== 'name-asc' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Sorted by:{' '}
              {sortField === 'name-desc'
                ? 'Z to A'
                : sortField === 'audit-recent'
                ? 'Last Audited'
                : sortField === 'audit-oldest'
                ? 'Oldest Audit'
                : sortField === 'stock-high'
                ? 'High Stock'
                : sortField === 'stock-low'
                ? 'Low Stock'
                : `WH: ${activeWarehouseName}`}
            </span>
          )}

          {sortWarehouseId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Building2 className="w-2.5 h-2.5" />
              <span>{activeWarehouseName}</span>
            </span>
          )}

          {filterDiscrepancyOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Discrepancies Only
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortField('name-asc');
              setSortWarehouseId('all');
              setFilterDiscrepancyOnly(false);
            }}
            className="text-[10px] text-slate-400 hover:text-white underline ml-1"
          >
            Reset
          </button>
        </div>
      )}

      {/* Category Filter Pills (Horizontal scrolling) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSelectedCategory('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Items ({products.length})
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
                  ? 'bg-slate-800 text-white border-slate-600 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Product List / Cards */}
      {processedProducts.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800/80 space-y-3">
          <Package className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">No products found</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery ? 'Try changing your search query or filters' : 'Add your first warehouse product to begin auditing'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition"
          >
            <span>Add New Product</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {processedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={categoryMap.get(product.categoryId)}
              onClick={() => onSelectProduct(product)}
            />
          ))}
        </div>
      )}

      {/* SORT & WAREHOUSE FILTER BOTTOM SHEET */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowSortSheet(false)} />

          <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Sort & Warehouse Options</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSortSheet(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Sort by Alphabetical & Date (User requested!) */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sort Products By
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Alphabet A-Z */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('name-asc');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'name-asc'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <ArrowDownAZ className="w-4 h-4" />
                  <span>Alphabet (A → Z)</span>
                </button>

                {/* Alphabet Z-A */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('name-desc');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'name-desc'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <ArrowUpAZ className="w-4 h-4" />
                  <span>Alphabet (Z → A)</span>
                </button>

                {/* Last Audited - Most Recent (User requested!) */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('audit-recent');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'audit-recent'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Last Audited First</span>
                </button>

                {/* Last Audited - Oldest / Never Audited (User requested!) */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('audit-oldest');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'audit-oldest'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Needs Audit First</span>
                </button>

                {/* Highest Total Stock */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('stock-high');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'stock-high'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <ArrowDown10 className="w-4 h-4" />
                  <span>Highest Stock Count</span>
                </button>

                {/* Lowest Total Stock */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortField('stock-low');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    sortField === 'stock-low'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                  }`}
                >
                  <ArrowUp01 className="w-4 h-4 text-rose-400" />
                  <span>Lowest Stock Count</span>
                </button>
              </div>
            </div>

            {/* 2. Sort by Different Warehouses (User requested!) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Sort by Warehouse Stock</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Order products by their stock level in a specific stockroom:
              </p>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSortWarehouseId('all');
                    if (sortField === 'warehouse-stock') setSortField('name-asc');
                  }}
                  className={`w-full p-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                    sortWarehouseId === 'all'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <span>All Warehouses Combined</span>
                  {sortWarehouseId === 'all' && <span>✓</span>}
                </button>

                {warehouses.map((wh) => (
                  <button
                    key={wh.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSortWarehouseId(wh.id);
                      setSortField('warehouse-stock');
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
                      sortWarehouseId === wh.id && sortField === 'warehouse-stock'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        {wh.code}
                      </span>
                      <span>{wh.name}</span>
                    </div>
                    {sortWarehouseId === wh.id && sortField === 'warehouse-stock' && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Done button */}
            <div className="pt-2 safe-bottom">
              <button
                type="button"
                onClick={() => setShowSortSheet(false)}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
              >
                Apply Sort & Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

