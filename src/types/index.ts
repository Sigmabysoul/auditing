export interface Warehouse {
  id: string;
  name: string;
  code: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // e.g. '#3b82f6' or Tailwind color name
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  details?: string;
  categoryId: string;
  image?: string; // base64 / data URL
  unit: string; // e.g. 'pcs', 'boxes', 'sets', 'kg'
  minStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseStock {
  id: string; // `${productId}_${warehouseId}`
  productId: string;
  warehouseId: string;
  stockNumber: number; // Previous audited stock number
  auditNumber: number; // Newly counted/implemented audit number
  lastAuditedAt?: string; // ISO string
  variance?: number; // auditNumber - stockNumber
  notes?: string;
}

export interface AuditLog {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  previousStock: number;
  auditedStock: number;
  variance: number;
  notes?: string;
  timestamp: string;
  isAppliedToStockApp?: boolean; // Track if user entered audit data in the real warehouse stock app
  appliedAt?: string;
}

export type ActiveTab = 'dashboard' | 'warehouses' | 'categories' | 'logs' | 'settings';

export interface ProductWithAggregateStock extends Product {
  totalStock: number;
  totalAuditStock: number;
  warehousesCount: number;
  hasDiscrepancy: boolean;
  lastAuditedAt?: string;
  stocks: (WarehouseStock & { warehouse?: Warehouse })[];
}
