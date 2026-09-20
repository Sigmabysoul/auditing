import Dexie, { type Table } from 'dexie';
import type { Warehouse, Category, Product, WarehouseStock, AuditLog } from '../types';
import { getProductPlaceholderSvg } from '../utils/imageUtils';

export class WarehouseAuditDatabase extends Dexie {
  warehouses!: Table<Warehouse, string>;
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  warehouseStocks!: Table<WarehouseStock, string>;
  auditLogs!: Table<AuditLog, string>;

  constructor() {
    super('WarehouseAuditDB');

    this.version(1).stores({
      warehouses: 'id, name, code, isDefault, createdAt',
      categories: 'id, name, color',
      products: 'id, name, sku, categoryId, createdAt, updatedAt',
      warehouseStocks: 'id, productId, warehouseId, [productId+warehouseId], lastAuditedAt',
      auditLogs: 'id, productId, warehouseId, timestamp',
    });
  }
}

export const db = new WarehouseAuditDatabase();

// Audit action handler
export async function recordAudit(
  productId: string,
  warehouseId: string,
  newAuditNumber: number,
  notes?: string
): Promise<WarehouseStock> {
  const stockId = `${productId}_${warehouseId}`;

  return await db.transaction('rw', db.warehouseStocks, db.auditLogs, db.products, db.warehouses, async () => {
    const existingStock = await db.warehouseStocks.get(stockId);
    const product = await db.products.get(productId);
    const warehouse = await db.warehouses.get(warehouseId);

    // The stock number shows the previous recorded/audited number
    const previousStockNumber = existingStock ? (existingStock.auditNumber ?? existingStock.stockNumber ?? 0) : 0;
    const variance = newAuditNumber - previousStockNumber;
    const timestamp = new Date().toISOString();

    const updatedStock: WarehouseStock = {
      id: stockId,
      productId,
      warehouseId,
      stockNumber: previousStockNumber, // previous audited baseline
      auditNumber: newAuditNumber,       // newly implemented audit count
      variance,
      lastAuditedAt: timestamp,
      notes: notes || existingStock?.notes || '',
    };

    await db.warehouseStocks.put(updatedStock);

    // Record in historical audit log
    const logEntry: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productId,
      productName: product?.name || 'Unknown Product',
      warehouseId,
      warehouseName: warehouse?.name || 'Unknown Warehouse',
      previousStock: previousStockNumber,
      auditedStock: newAuditNumber,
      variance,
      notes,
      timestamp,
    };

    await db.auditLogs.add(logEntry);

    // Update product updatedAt timestamp
    if (product) {
      await db.products.update(productId, { updatedAt: timestamp });
    }

    return updatedStock;
  });
}

// Seed initial realistic data if database is empty
export async function seedInitialDataIfNeeded(force = false): Promise<void> {
  const warehouseCount = await db.warehouses.count();
  if (warehouseCount > 0 && !force) {
    return;
  }

  if (force) {
    await db.warehouseStocks.clear();
    await db.auditLogs.clear();
    await db.products.clear();
    await db.categories.clear();
    await db.warehouses.clear();
  }

  const now = new Date().toISOString();

  // 1. Initial Warehouses
  const initialWarehouses: Warehouse[] = [
    {
      id: 'wh_main',
      name: 'Main Stockroom A',
      code: 'WH-A',
      description: 'Primary storage, shelf aisles 1-12',
      isDefault: true,
      createdAt: now,
    },
    {
      id: 'wh_east',
      name: 'East Transit Bay',
      code: 'BAY-E',
      description: 'Rapid dispatch and staging racks',
      isDefault: false,
      createdAt: now,
    },
    {
      id: 'wh_cold',
      name: 'Reserve Cold Zone',
      code: 'ZONE-C',
      description: 'Climate-controlled back room',
      isDefault: false,
      createdAt: now,
    },
  ];

  // 2. Initial Categories
  const initialCategories: Category[] = [
    { id: 'cat_pack', name: 'Packaging & Cartons', color: '#f59e0b', description: 'Boxes, tapes, and packing wraps' },
    { id: 'cat_fluid', name: 'Fluids & Lubricants', color: '#06b6d4', description: 'Hydraulic oils and coolants' },
    { id: 'cat_safety', name: 'Safety & PPE', color: '#ef4444', description: 'Gloves, helmets, and hi-vis vests' },
    { id: 'cat_hardware', name: 'Hardware & Fasteners', color: '#8b5cf6', description: 'Bolts, brackets, and anchors' },
    { id: 'cat_elec', name: 'Electronics & Sensors', color: '#10b981', description: 'Cables, battery packs, and sensors' },
  ];

  // 3. Initial Products
  const initialProducts: Product[] = [
    {
      id: 'prod_1',
      name: 'Industrial Carton Boxes 14x14',
      sku: 'BX-1414',
      details: 'Heavy-duty double wall corrugated shipping boxes. Aisle 2, Pallet 4.',
      categoryId: 'cat_pack',
      image: getProductPlaceholderSvg('Carton Boxes', '#f59e0b'),
      unit: 'boxes',
      minStockThreshold: 40,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_2',
      name: 'Hydraulic Fluid ISO VG 46 (5L)',
      sku: 'HYD-46-5L',
      details: 'Premium anti-wear fluid for forklifts and dock levelers. Flammable locker.',
      categoryId: 'cat_fluid',
      image: getProductPlaceholderSvg('Hydraulic Fluid', '#06b6d4'),
      unit: 'bottles',
      minStockThreshold: 15,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_3',
      name: 'Heavy Duty Grip Work Gloves (L)',
      sku: 'PPE-GLV-L',
      details: 'Nitrile coated breathable safety work gloves, pack of 12.',
      categoryId: 'cat_safety',
      image: getProductPlaceholderSvg('Safety Gloves', '#ef4444'),
      unit: 'packs',
      minStockThreshold: 25,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_4',
      name: 'M10 Hex Bolts High Tensile (100pk)',
      sku: 'BLT-M10-100',
      details: 'Zinc-plated grade 8.8 bolts for rack reinforcement. Bin 4C.',
      categoryId: 'cat_hardware',
      image: getProductPlaceholderSvg('Hex Bolts', '#8b5cf6'),
      unit: 'boxes',
      minStockThreshold: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_5',
      name: 'Rechargeable Scanner Battery Pack',
      sku: 'BAT-SCN-200',
      details: 'Lithium-ion replacement pack for zebra handheld scanners.',
      categoryId: 'cat_elec',
      image: getProductPlaceholderSvg('Scanner Battery', '#10b981'),
      unit: 'units',
      minStockThreshold: 5,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 4. Initial Stock allocations per warehouse
  const initialStocks: WarehouseStock[] = [
    // Product 1 (Carton Boxes)
    { id: 'prod_1_wh_main', productId: 'prod_1', warehouseId: 'wh_main', stockNumber: 120, auditNumber: 115, variance: -5, lastAuditedAt: now, notes: '5 boxes water damaged in rain' },
    { id: 'prod_1_wh_east', productId: 'prod_1', warehouseId: 'wh_east', stockNumber: 45, auditNumber: 45, variance: 0, lastAuditedAt: now },
    { id: 'prod_1_wh_cold', productId: 'prod_1', warehouseId: 'wh_cold', stockNumber: 0, auditNumber: 0, variance: 0, lastAuditedAt: now },

    // Product 2 (Hydraulic Fluid)
    { id: 'prod_2_wh_main', productId: 'prod_2', warehouseId: 'wh_main', stockNumber: 18, auditNumber: 18, variance: 0, lastAuditedAt: now },
    { id: 'prod_2_wh_east', productId: 'prod_2', warehouseId: 'wh_east', stockNumber: 6, auditNumber: 8, variance: 2, lastAuditedAt: now, notes: '2 returned from maintenance' },
    { id: 'prod_2_wh_cold', productId: 'prod_2', warehouseId: 'wh_cold', stockNumber: 0, auditNumber: 0, variance: 0, lastAuditedAt: now },

    // Product 3 (Gloves)
    { id: 'prod_3_wh_main', productId: 'prod_3', warehouseId: 'wh_main', stockNumber: 30, auditNumber: 26, variance: -4, lastAuditedAt: now, notes: 'Issued to shift B' },
    { id: 'prod_3_wh_east', productId: 'prod_3', warehouseId: 'wh_east', stockNumber: 15, auditNumber: 15, variance: 0, lastAuditedAt: now },
    { id: 'prod_3_wh_cold', productId: 'prod_3', warehouseId: 'wh_cold', stockNumber: 10, auditNumber: 10, variance: 0, lastAuditedAt: now },

    // Product 4 (Hex Bolts)
    { id: 'prod_4_wh_main', productId: 'prod_4', warehouseId: 'wh_main', stockNumber: 22, auditNumber: 22, variance: 0, lastAuditedAt: now },
    { id: 'prod_4_wh_east', productId: 'prod_4', warehouseId: 'wh_east', stockNumber: 8, auditNumber: 8, variance: 0, lastAuditedAt: now },
    { id: 'prod_4_wh_cold', productId: 'prod_4', warehouseId: 'wh_cold', stockNumber: 4, auditNumber: 4, variance: 0, lastAuditedAt: now },

    // Product 5 (Scanner Battery)
    { id: 'prod_5_wh_main', productId: 'prod_5', warehouseId: 'wh_main', stockNumber: 8, auditNumber: 7, variance: -1, lastAuditedAt: now, notes: '1 sent for testing' },
    { id: 'prod_5_wh_east', productId: 'prod_5', warehouseId: 'wh_east', stockNumber: 3, auditNumber: 3, variance: 0, lastAuditedAt: now },
    { id: 'prod_5_wh_cold', productId: 'prod_5', warehouseId: 'wh_cold', stockNumber: 0, auditNumber: 0, variance: 0, lastAuditedAt: now },
  ];

  // 5. Initial Audit Logs
  const initialLogs: AuditLog[] = [
    {
      id: 'log_seed_1',
      productId: 'prod_1',
      productName: 'Industrial Carton Boxes 14x14',
      warehouseId: 'wh_main',
      warehouseName: 'Main Stockroom A',
      previousStock: 120,
      auditedStock: 115,
      variance: -5,
      notes: '5 boxes water damaged in rain',
      timestamp: now,
    },
    {
      id: 'log_seed_2',
      productId: 'prod_2',
      productName: 'Hydraulic Fluid ISO VG 46 (5L)',
      warehouseId: 'wh_east',
      warehouseName: 'East Transit Bay',
      previousStock: 6,
      auditedStock: 8,
      variance: 2,
      notes: '2 returned from maintenance',
      timestamp: now,
    },
  ];

  await db.warehouses.bulkAdd(initialWarehouses);
  await db.categories.bulkAdd(initialCategories);
  await db.products.bulkAdd(initialProducts);
  await db.warehouseStocks.bulkAdd(initialStocks);
  await db.auditLogs.bulkAdd(initialLogs);
}

// Export entire database as JSON file for phone backup
export async function exportDatabaseToJson(): Promise<string> {
  const warehouses = await db.warehouses.toArray();
  const categories = await db.categories.toArray();
  const products = await db.products.toArray();
  const warehouseStocks = await db.warehouseStocks.toArray();
  const auditLogs = await db.auditLogs.toArray();

  const backupData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    appName: 'StockAudit Warehouse Tracker',
    warehouses,
    categories,
    products,
    warehouseStocks,
    auditLogs,
  };

  return JSON.stringify(backupData, null, 2);
}

// Import JSON backup into IndexedDB
export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.warehouses || !data.products) {
      throw new Error('Invalid backup file format');
    }

    await db.transaction('rw', [db.warehouses, db.categories, db.products, db.warehouseStocks, db.auditLogs], async () => {
      await db.warehouses.clear();
      await db.categories.clear();
      await db.products.clear();
      await db.warehouseStocks.clear();
      await db.auditLogs.clear();

      if (data.warehouses?.length) await db.warehouses.bulkAdd(data.warehouses);
      if (data.categories?.length) await db.categories.bulkAdd(data.categories);
      if (data.products?.length) await db.products.bulkAdd(data.products);
      if (data.warehouseStocks?.length) await db.warehouseStocks.bulkAdd(data.warehouseStocks);
      if (data.auditLogs?.length) await db.auditLogs.bulkAdd(data.auditLogs);
    });

    return true;
  } catch (err) {
    console.error('Failed to import database:', err);
    throw err;
  }
}
