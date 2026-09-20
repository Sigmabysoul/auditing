import React, { useState, useRef } from 'react';
import type { Product, Category, Warehouse } from '../types';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Building2,
  Tag,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { db } from '../db/db';
import { compressAndResizeImage, getProductPlaceholderSvg, triggerHaptic } from '../utils/imageUtils';

interface ProductFormModalProps {
  initialProduct?: Product;
  categories: Category[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: () => void;
  onOpenNewCategory: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  initialProduct,
  categories,
  warehouses,
  onClose,
  onSaved,
  onOpenNewCategory,
}) => {
  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || categories[0]?.id || '');
  const [details, setDetails] = useState(initialProduct?.details || '');
  const [unit, setUnit] = useState(initialProduct?.unit || 'pcs');
  const [minStockThreshold, setMinStockThreshold] = useState<number | ''>(
    initialProduct?.minStockThreshold ?? 10
  );
  const [image, setImage] = useState<string | undefined>(initialProduct?.image);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initial stocks per warehouse for new products
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, number>>({});

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing warehouse stocks if editing
  React.useEffect(() => {
    if (initialProduct) {
      db.warehouseStocks
        .where('productId')
        .equals(initialProduct.id)
        .toArray()
        .then((stocks) => {
          const map: Record<string, number> = {};
          stocks.forEach((s) => {
            map[s.warehouseId] = s.auditNumber ?? s.stockNumber ?? 0;
          });
          setWarehouseStocks(map);
        });
    }
  }, [initialProduct]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      triggerHaptic('light');
      const compressedDataUrl = await compressAndResizeImage(file, 800, 800, 0.8);
      setImage(compressedDataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Could not process the selected image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleStockChange = (whId: string, value: string) => {
    const num = parseInt(value, 10);
    setWarehouseStocks((prev) => ({
      ...prev,
      [whId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const productId = initialProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const productPayload: Product = {
        id: productId,
        name: name.trim(),
        sku: sku.trim() || undefined,
        categoryId: categoryId || categories[0]?.id || 'cat_default',
        details: details.trim() || undefined,
        image: image || (initialProduct?.image ? initialProduct.image : undefined),
        unit: unit.trim() || 'pcs',
        minStockThreshold: minStockThreshold === '' ? undefined : Number(minStockThreshold),
        createdAt: initialProduct?.createdAt || now,
        updatedAt: now,
      };

      await db.transaction('rw', db.products, db.warehouseStocks, db.auditLogs, async () => {
        // Save product
        await db.products.put(productPayload);

        // Save or update warehouse stocks
        for (const wh of warehouses) {
          const stockId = `${productId}_${wh.id}`;
          const currentCount = warehouseStocks[wh.id] ?? 0;
          const existing = await db.warehouseStocks.get(stockId);

          if (existing) {
            // Updating existing product
            await db.warehouseStocks.update(stockId, {
              auditNumber: currentCount,
              stockNumber: currentCount,
              variance: 0,
              lastAuditedAt: existing.lastAuditedAt || now,
            });
          } else {
            // New product stock initial assignment
            await db.warehouseStocks.put({
              id: stockId,
              productId,
              warehouseId: wh.id,
              stockNumber: currentCount,
              auditNumber: currentCount,
              variance: 0,
              lastAuditedAt: now,
              notes: 'Initial stock setup',
            });
          }
        }
      });

      triggerHaptic('success');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const commonUnits = ['pcs', 'boxes', 'packs', 'bottles', 'bags', 'kg', 'meters'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">
            {initialProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Image Capture & Upload Section */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Product Image</span>
              </span>
              {image && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('warning');
                    setImage(undefined);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}
            </label>

            <div className="flex items-center gap-3">
              {/* Preview Thumbnail */}
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-inner">
                {isCompressing ? (
                  <div className="text-[10px] text-emerald-400 font-medium animate-pulse text-center px-1">
                    Optimizing...
                  </div>
                ) : image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={getProductPlaceholderSvg(name || 'Product', '#10b981')}
                    alt="Placeholder"
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
              </div>

              {/* Action Buttons: Camera and Gallery */}
              <div className="flex-1 flex flex-col gap-2">
                {/* Camera Input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageFile}
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    cameraInputRef.current?.click();
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold active:scale-95 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo with Camera</span>
                </button>

                {/* Gallery File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium active:scale-95 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose from Gallery</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Name & SKU */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Heavy Duty Shrink Wrap 500m"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* SKU / Barcode & Unit */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">SKU / Barcode</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., WRAP-500"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Counting Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., boxes"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Unit Quick Suggestions */}
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {commonUnits.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setUnit(u);
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                  unit === u
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Category</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenNewCategory();
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>New Category</span>
              </button>
            </div>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min="0"
              value={minStockThreshold}
              onChange={(e) => {
                const val = e.target.value;
                setMinStockThreshold(val === '' ? '' : parseInt(val, 10));
              }}
              placeholder="e.g. 15"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[10px] text-slate-400">
              Warns you when total stock drops below this quantity.
            </p>
          </div>

          {/* Product Details / Rack location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Product Details & Location Notes
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g., Aisle 4, Shelf C3. Heavy boxes, keep dry."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Initial Warehouse Stock Allocations */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stock Quantities per Warehouse</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Assign initial count for each stockroom:
            </p>

            {warehouses.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No warehouses available yet.</p>
            ) : (
              <div className="space-y-2">
                {warehouses.map((wh) => (
                  <div
                    key={wh.id}
                    className="flex items-center justify-between gap-3 bg-slate-850 p-2 rounded-xl border border-slate-700/60"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {wh.name}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {wh.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={warehouseStocks[wh.id] ?? 0}
                        onChange={(e) => handleStockChange(wh.id, e.target.value)}
                        className="w-20 text-center font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400 font-medium">
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2 safe-bottom">
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSaving ? 'Saving Product...' : initialProduct ? 'Update Product' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
