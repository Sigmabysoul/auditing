import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded } from './db/db';
import type {
  ActiveTab,
  ProductWithAggregateStock,
  Product,
  Warehouse,
  WarehouseStock,
  Category,
  AuditLog
} from './types';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuditModal } from './components/AuditModal';
import { ProductFormModal } from './components/ProductFormModal';
import { WarehouseManagementModal } from './components/WarehouseManagementModal';
import { CategoryManagementModal } from './components/CategoryManagementModal';
import { AuditHistoryView } from './components/AuditHistoryView';
import { SettingsView } from './components/SettingsView';
import { DataTransferModal } from './components/DataTransferModal';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [dbInitialized, setDbInitialized] = useState(false);

  // Modal / Drawer states
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<ProductWithAggregateStock | null>(null);
  const [auditTarget, setAuditTarget] = useState<{
    product: ProductWithAggregateStock;
    warehouse: Warehouse;
    stock?: WarehouseStock;
  } | null>(null);
  const [productFormState, setProductFormState] = useState<{
    isOpen: boolean;
    initialProduct?: Product;
  }>({ isOpen: false });
  const [isManagingWarehouses, setIsManagingWarehouses] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isDataTransferOpen, setIsDataTransferOpen] = useState(false);

  // Seed on initial mount
  useEffect(() => {
    seedInitialDataIfNeeded().then(() => setDbInitialized(true));
  }, []);

  // Reactive Dexie queries with default empty array references
  const warehouses = useLiveQuery(() => db.warehouses.toArray(), [], [] as Warehouse[]);
  const categories = useLiveQuery(() => db.categories.toArray(), [], [] as Category[]);
  const rawProducts = useLiveQuery(() => db.products.toArray(), [], [] as Product[]);
  const warehouseStocks = useLiveQuery(() => db.warehouseStocks.toArray(), [], [] as WarehouseStock[]);
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray(), [], [] as AuditLog[]);

  // Warehouse lookup map
  const warehouseMap = useMemo(() => {
    const map = new Map<string, Warehouse>();
    warehouses.forEach((w) => map.set(w.id, w));
    return map;
  }, [warehouses]);

  // Aggregate stock counts for each product
  const productsWithStock: ProductWithAggregateStock[] = useMemo(() => {
    return rawProducts.map((prod) => {
      const stocksForProd = warehouseStocks.filter((s) => s.productId === prod.id);
      const mappedStocks = stocksForProd.map((s) => ({
        ...s,
        warehouse: warehouseMap.get(s.warehouseId),
      }));

      // Total current stock (based on latest audited or recorded numbers)
      const totalStock = mappedStocks.reduce(
        (sum, s) => sum + (s.auditNumber ?? s.stockNumber ?? 0),
        0
      );

      const totalAuditStock = mappedStocks.reduce(
        (sum, s) => sum + (s.auditNumber ?? 0),
        0
      );

      const hasDiscrepancy = mappedStocks.some((s) => (s.variance || 0) !== 0);

      // Find newest audit timestamp
      const timestamps = mappedStocks
        .map((s) => (s.lastAuditedAt ? new Date(s.lastAuditedAt).getTime() : 0))
        .filter((t) => t > 0);
      const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
      const lastAuditedAt = latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined;

      return {
        ...prod,
        totalStock,
        totalAuditStock,
        warehousesCount: mappedStocks.length > 0 ? mappedStocks.length : warehouses.length,
        hasDiscrepancy,
        lastAuditedAt,
        stocks: mappedStocks,
      };
    });
  }, [rawProducts, warehouseStocks, warehouseMap, warehouses.length]);

  // Sync selectedProductForDetail with latest live data
  const currentDetailProduct = useMemo(() => {
    if (!selectedProductForDetail) return null;
    return productsWithStock.find((p) => p.id === selectedProductForDetail.id) || null;
  }, [productsWithStock, selectedProductForDetail]);

  const discrepanciesCount = useMemo(() => {
    return productsWithStock.filter((p) => p.hasDiscrepancy).length;
  }, [productsWithStock]);

  const handleDeleteProduct = async (productId: string) => {
    await db.transaction('rw', db.products, db.warehouseStocks, async () => {
      await db.products.delete(productId);
      const stocks = await db.warehouseStocks.where('productId').equals(productId).toArray();
      for (const s of stocks) {
        await db.warehouseStocks.delete(s.id);
      }
    });
    setSelectedProductForDetail(null);
  };

  if (!dbInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Loading Warehouse Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        onOpenNewProduct={() => setProductFormState({ isOpen: true })}
        onOpenNewWarehouse={() => setIsManagingWarehouses(true)}
        onOpenNewCategory={() => setIsManagingCategories(true)}
        onOpenTransfer={() => setIsDataTransferOpen(true)}
        totalProductsCount={productsWithStock.length}
      />

      {/* Main Tab Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={productsWithStock}
            categories={categories}
            warehouses={warehouses}
            onSelectProduct={(prod) => setSelectedProductForDetail(prod)}
            onOpenNewProduct={() => setProductFormState({ isOpen: true })}
          />
        )}

        {activeTab === 'warehouses' && (
          <div className="p-4">
            <WarehouseManagementModal
              warehouses={warehouses}
              warehouseStocks={warehouseStocks}
              onClose={() => setActiveTab('dashboard')}
              onRefresh={() => {}}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-4">
            <CategoryManagementModal
              categories={categories}
              onClose={() => setActiveTab('dashboard')}
              onRefresh={() => {}}
            />
          </div>
        )}

        {activeTab === 'logs' && (
          <AuditHistoryView logs={auditLogs} onRefresh={() => {}} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onDataChanged={() => {}}
            onOpenTransfer={() => setIsDataTransferOpen(true)}
          />
        )}
      </main>

      {/* Product Detail Modal (Shows stock division across all warehouses) */}
      {currentDetailProduct && (
        <ProductDetailModal
          product={currentDetailProduct}
          category={categories.find((c) => c.id === currentDetailProduct.categoryId)}
          warehouses={warehouses}
          onClose={() => setSelectedProductForDetail(null)}
          onEditProduct={(p) => {
            setSelectedProductForDetail(null);
            setProductFormState({ isOpen: true, initialProduct: p });
          }}
          onDeleteProduct={handleDeleteProduct}
          onSelectWarehouseForAudit={(product, warehouse, stock) => {
            setAuditTarget({ product, warehouse, stock });
          }}
        />
      )}

      {/* Audit Modal (Drill-down from warehouse selection) */}
      {auditTarget && (
        <AuditModal
          product={auditTarget.product}
          warehouse={auditTarget.warehouse}
          existingStock={auditTarget.stock}
          onClose={() => setAuditTarget(null)}
          onAuditSaved={() => {
            // Keep detail modal updated reactively
          }}
        />
      )}

      {/* Product Add / Edit Modal */}
      {productFormState.isOpen && (
        <ProductFormModal
          initialProduct={productFormState.initialProduct}
          categories={categories}
          warehouses={warehouses}
          onClose={() => setProductFormState({ isOpen: false })}
          onSaved={() => {}}
          onOpenNewCategory={() => setIsManagingCategories(true)}
        />
      )}

      {/* Warehouse Management Modal (Opened via Navbar button) */}
      {isManagingWarehouses && activeTab !== 'warehouses' && (
        <WarehouseManagementModal
          warehouses={warehouses}
          warehouseStocks={warehouseStocks}
          onClose={() => setIsManagingWarehouses(false)}
          onRefresh={() => {}}
        />
      )}

      {/* Category Management Modal (Opened via Navbar or Product Form) */}
      {isManagingCategories && activeTab !== 'categories' && (
        <CategoryManagementModal
          categories={categories}
          onClose={() => setIsManagingCategories(false)}
          onRefresh={() => {}}
        />
      )}

      {/* Data Transfer (Download / Upload) & Supabase Cloud Modal */}
      {isDataTransferOpen && (
        <DataTransferModal
          onClose={() => setIsDataTransferOpen(false)}
          onDataChanged={() => {}}
          productsCount={productsWithStock.length}
          warehousesCount={warehouses.length}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
        }}
        discrepanciesCount={discrepanciesCount}
      />
    </div>
  );
}

export default App;
