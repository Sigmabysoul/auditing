import { db } from '../db/db';
import { getSupabaseClient } from './supabase';
import type { Warehouse, Category, Product, WarehouseStock, AuditLog } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  warehousesCount?: number;
  categoriesCount?: number;
  productsCount?: number;
  stocksCount?: number;
  auditLogsCount?: number;
}

export async function pushLocalToSupabase(): Promise<SyncResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured yet.' };
  }

  try {
    const warehouses = await db.warehouses.toArray();
    const categories = await db.categories.toArray();
    const products = await db.products.toArray();
    const warehouseStocks = await db.warehouseStocks.toArray();
    const auditLogs = await db.auditLogs.toArray();

    // 1. Upsert Warehouses
    if (warehouses.length > 0) {
      const payload = warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        description: w.description || null,
        is_default: w.isDefault || false,
        created_at: w.createdAt,
      }));
      const { error } = await client.from('warehouses').upsert(payload);
      if (error) throw new Error(`Warehouses sync error: ${error.message}`);
    }

    // 2. Upsert Categories
    if (categories.length > 0) {
      const payload = categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        description: c.description || null,
      }));
      const { error } = await client.from('categories').upsert(payload);
      if (error) throw new Error(`Categories sync error: ${error.message}`);
    }

    // 3. Upsert Products
    if (products.length > 0) {
      const payload = products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || null,
        details: p.details || null,
        category_id: p.categoryId,
        image: p.image || null,
        unit: p.unit || 'pcs',
        min_stock_threshold: p.minStockThreshold ?? 10,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));
      const { error } = await client.from('products').upsert(payload);
      if (error) throw new Error(`Products sync error: ${error.message}`);
    }

    // 4. Upsert Warehouse Stocks
    if (warehouseStocks.length > 0) {
      const payload = warehouseStocks.map((s) => ({
        id: s.id,
        product_id: s.productId,
        warehouse_id: s.warehouseId,
        stock_number: s.stockNumber ?? 0,
        audit_number: s.auditNumber ?? 0,
        variance: s.variance ?? 0,
        last_audited_at: s.lastAuditedAt || new Date().toISOString(),
        notes: s.notes || null,
      }));
      const { error } = await client.from('warehouse_stocks').upsert(payload);
      if (error) throw new Error(`Warehouse stocks sync error: ${error.message}`);
    }

    // 5. Upsert Audit Logs
    if (auditLogs.length > 0) {
      const payload = auditLogs.map((l) => ({
        id: l.id,
        product_id: l.productId,
        product_name: l.productName,
        warehouse_id: l.warehouseId,
        warehouse_name: l.warehouseName,
        previous_stock: l.previousStock ?? 0,
        audited_stock: l.auditedStock ?? 0,
        variance: l.variance ?? 0,
        notes: l.notes || null,
        timestamp: l.timestamp,
        is_applied_to_stock_app: l.isAppliedToStockApp || false,
        applied_at: l.appliedAt || null,
      }));
      const { error } = await client.from('audit_logs').upsert(payload);
      if (error) throw new Error(`Audit logs sync error: ${error.message}`);
    }

    return {
      success: true,
      message: 'Successfully pushed all local warehouse data to Supabase!',
      warehousesCount: warehouses.length,
      categoriesCount: categories.length,
      productsCount: products.length,
      stocksCount: warehouseStocks.length,
      auditLogsCount: auditLogs.length,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown sync error occurred',
    };
  }
}

export async function pullSupabaseToLocal(): Promise<SyncResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured yet.' };
  }

  try {
    const [whRes, catRes, prodRes, stockRes, logRes] = await Promise.all([
      client.from('warehouses').select('*'),
      client.from('categories').select('*'),
      client.from('products').select('*'),
      client.from('warehouse_stocks').select('*'),
      client.from('audit_logs').select('*'),
    ]);

    if (whRes.error) throw new Error(`Fetch warehouses error: ${whRes.error.message}`);
    if (catRes.error) throw new Error(`Fetch categories error: ${catRes.error.message}`);
    if (prodRes.error) throw new Error(`Fetch products error: ${prodRes.error.message}`);
    if (stockRes.error) throw new Error(`Fetch stocks error: ${stockRes.error.message}`);
    if (logRes.error) throw new Error(`Fetch logs error: ${logRes.error.message}`);

    const mappedWarehouses: Warehouse[] = (whRes.data || []).map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      description: w.description || undefined,
      isDefault: w.is_default,
      createdAt: w.created_at,
    }));

    const mappedCategories: Category[] = (catRes.data || []).map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      description: c.description || undefined,
    }));

    const mappedProducts: Product[] = (prodRes.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || undefined,
      details: p.details || undefined,
      categoryId: p.category_id,
      image: p.image || undefined,
      unit: p.unit || 'pcs',
      minStockThreshold: p.min_stock_threshold,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const mappedStocks: WarehouseStock[] = (stockRes.data || []).map((s) => ({
      id: s.id,
      productId: s.product_id,
      warehouseId: s.warehouse_id,
      stockNumber: s.stock_number,
      auditNumber: s.audit_number,
      variance: s.variance,
      lastAuditedAt: s.last_audited_at,
      notes: s.notes || undefined,
    }));

    const mappedLogs: AuditLog[] = (logRes.data || []).map((l) => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      warehouseId: l.warehouse_id,
      warehouseName: l.warehouse_name,
      previousStock: l.previous_stock,
      auditedStock: l.audited_stock,
      variance: l.variance,
      notes: l.notes || undefined,
      timestamp: l.timestamp,
      isAppliedToStockApp: l.is_applied_to_stock_app || false,
      appliedAt: l.applied_at || undefined,
    }));

    await db.transaction('rw', [db.warehouses, db.categories, db.products, db.warehouseStocks, db.auditLogs], async () => {
      await db.warehouses.clear();
      await db.categories.clear();
      await db.products.clear();
      await db.warehouseStocks.clear();
      await db.auditLogs.clear();

      if (mappedWarehouses.length > 0) await db.warehouses.bulkAdd(mappedWarehouses);
      if (mappedCategories.length > 0) await db.categories.bulkAdd(mappedCategories);
      if (mappedProducts.length > 0) await db.products.bulkAdd(mappedProducts);
      if (mappedStocks.length > 0) await db.warehouseStocks.bulkAdd(mappedStocks);
      if (mappedLogs.length > 0) await db.auditLogs.bulkAdd(mappedLogs);
    });

    return {
      success: true,
      message: 'Successfully pulled database from Supabase to local storage!',
      warehousesCount: mappedWarehouses.length,
      categoriesCount: mappedCategories.length,
      productsCount: mappedProducts.length,
      stocksCount: mappedStocks.length,
      auditLogsCount: mappedLogs.length,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown sync error occurred',
    };
  }
}

