import React, { useState } from 'react';
import type { Warehouse, WarehouseStock } from '../types';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Package,
  Layers
} from 'lucide-react';
import { db } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';

interface WarehouseManagementModalProps {
  warehouses: Warehouse[];
  warehouseStocks: WarehouseStock[];
  onClose: () => void;
  onRefresh: () => void;
}

export const WarehouseManagementModal: React.FC<WarehouseManagementModalProps> = ({
  warehouses,
  warehouseStocks,
  onClose,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setEditingId(null);
    setIsEditing(false);
  };

  const handleStartEdit = (wh: Warehouse) => {
    triggerHaptic('light');
    setName(wh.name);
    setCode(wh.code);
    setDescription(wh.description || '');
    setEditingId(wh.id);
    setIsEditing(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Please fill in both warehouse name and code');
      return;
    }

    try {
      setIsSaving(true);
      const now = new Date().toISOString();

      if (editingId) {
        await db.warehouses.update(editingId, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
        });
      } else {
        const newId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.warehouses.add({
          id: newId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          isDefault: warehouses.length === 0,
          createdAt: now,
        });
      }

      triggerHaptic('success');
      resetForm();
      onRefresh();
    } catch (err) {
      console.error('Failed to save warehouse:', err);
      alert('Failed to save warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWarehouse = async (wh: Warehouse) => {
    if (warehouses.length <= 1) {
      alert('You must keep at least one warehouse.');
      return;
    }

    triggerHaptic('warning');
    if (
      window.confirm(
        `Are you sure you want to delete "${wh.name}"? All associated stock counts in this warehouse will be removed.`
      )
    ) {
      await db.transaction('rw', db.warehouses, db.warehouseStocks, async () => {
        await db.warehouses.delete(wh.id);
        const stocksToDelete = await db.warehouseStocks.where('warehouseId').equals(wh.id).toArray();
        for (const s of stocksToDelete) {
          await db.warehouseStocks.delete(s.id);
        }
      });
      triggerHaptic('light');
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Manage Warehouses & Stockrooms</h2>
          </div>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Create or Edit Form */}
          <form
            onSubmit={handleSaveWarehouse}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isEditing ? 'Edit Stockroom' : 'Create New Stockroom'}</span>
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., North Mezzanine"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. WH-B"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Location Notes</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Back aisle near dispatch loading dock"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isEditing ? 'Update Stockroom' : 'Add Stockroom'}</span>
            </button>
          </form>

          {/* Existing Warehouses List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Stockrooms ({warehouses.length})
            </h3>

            <div className="space-y-2">
              {warehouses.map((wh) => {
                const whStocks = warehouseStocks.filter((s) => s.warehouseId === wh.id);
                const totalUnits = whStocks.reduce((acc, s) => acc + (s.auditNumber ?? s.stockNumber ?? 0), 0);

                return (
                  <div
                    key={wh.id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {wh.code}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">{wh.name}</h4>
                      </div>

                      {wh.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{wh.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-500" />
                          <span>{whStocks.length} products</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Layers className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{totalUnits} units total</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(wh)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWarehouse(wh)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
