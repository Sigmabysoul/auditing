import React, { useState } from 'react';
import type { ProductWithAggregateStock, Warehouse, WarehouseStock } from '../types';
import {
  X,
  ClipboardCheck,
  Building2,
  Package,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { recordAudit } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';

interface AuditModalProps {
  product: ProductWithAggregateStock;
  warehouse: Warehouse;
  existingStock?: WarehouseStock;
  onClose: () => void;
  onAuditSaved: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  product,
  warehouse,
  existingStock,
  onClose,
  onAuditSaved,
}) => {
  // previous stock baseline
  const previousStockNumber = existingStock
    ? (existingStock.auditNumber ?? existingStock.stockNumber ?? 0)
    : 0;

  // current audit count being entered
  const [auditCount, setAuditCount] = useState<number>(previousStockNumber);
  const [notes, setNotes] = useState<string>(existingStock?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const variance = auditCount - previousStockNumber;

  const handleAdjust = (delta: number) => {
    triggerHaptic('light');
    setAuditCount((prev) => Math.max(0, prev + delta));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auditCount < 0) return;

    try {
      setIsSaving(true);
      await recordAudit(product.id, warehouse.id, auditCount, notes.trim());
      triggerHaptic('success');
      onAuditSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save audit:', err);
      triggerHaptic('warning');
      alert('Failed to save audit record.');
    } finally {
      setIsSaving(false);
    }
  };

  const quickNotes = ['Damaged goods', 'Misplaced items', 'Stock expired', 'Physical count verified', 'Shipped out unrecorded'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />

        {/* Modal Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Stockroom Audit</h2>
              <p className="text-[11px] text-slate-400">Count and implement audited stock</p>
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Warehouse & Product Info Card */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-white">{warehouse.name}</span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">
                {warehouse.code}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 pt-1 border-t border-slate-700/60">
              <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-slate-200 truncate font-medium">{product.name}</span>
            </div>
          </div>

          {/* Previous Stock Baseline vs New Audit Count */}
          <div className="grid grid-cols-2 gap-2">
            {/* Previous Stock Number & Previous Audit Date */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Previous Stock
                </span>
                <div className="text-2xl font-bold font-mono text-slate-200 mt-0.5">
                  {previousStockNumber}
                </div>
                <span className="text-[10px] text-slate-400">{product.unit} (Recorded)</span>
              </div>

              {/* Date of previous audit done */}
              <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">
                  {existingStock?.lastAuditedAt
                    ? `Audited ${new Date(existingStock.lastAuditedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'No previous audit'}
                </span>
              </div>
            </div>

            {/* Live Variance */}
            <div
              className={`border rounded-2xl p-3 text-center flex flex-col justify-center ${
                variance === 0
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                  : variance < 0
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                  : 'bg-blue-950/30 border-blue-500/30 text-blue-400'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider block">
                Calculated Variance
              </span>
              <div className="text-2xl font-bold font-mono mt-1 flex items-center justify-center gap-1">
                {variance === 0 ? (
                  <CheckCircle2 className="w-5 h-5 inline text-emerald-400" />
                ) : variance < 0 ? (
                  <AlertTriangle className="w-5 h-5 inline text-rose-400" />
                ) : (
                  <TrendingUp className="w-5 h-5 inline text-blue-400" />
                )}
                <span>{variance > 0 ? `+${variance}` : variance}</span>
              </div>
              <span className="text-[10px] opacity-80">
                {variance === 0 ? 'Balanced' : variance < 0 ? 'Deficit / Short' : 'Surplus / Excess'}
              </span>
            </div>
          </div>

          {/* New Audit Stock Counter (User requirement: "the audit stock is the number i implement") */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>New Audit Stock Count</span>
              </label>
              <span className="text-xs font-medium text-slate-400">
                Unit: <strong className="text-white">{product.unit}</strong>
              </span>
            </div>

            {/* Main Interactive Numeric Input */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-white flex items-center justify-center transition shadow-md"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex-1 max-w-[170px]">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={auditCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAuditCount(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full text-center text-3xl font-black font-mono text-emerald-400 bg-slate-900 border-2 border-emerald-500/50 focus:border-emerald-400 focus:outline-none rounded-2xl py-2 px-3 shadow-inner"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAdjust(1)}
                className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-white flex items-center justify-center transition shadow-md"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick Adjustment Stepper Row (Designed for one-handed thumb use) */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[-10, -5, -1, 1, 5, 10].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleAdjust(step)}
                  className="py-1.5 px-1 rounded-xl bg-slate-750 hover:bg-slate-700 active:bg-slate-600 active:scale-95 text-xs font-mono font-bold text-slate-200 border border-slate-700 transition"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAuditCount(previousStockNumber);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Match Previous ({previousStockNumber})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning');
                  setAuditCount(0);
                }}
                className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition"
              >
                Zero Stock (0)
              </button>
            </div>
          </div>

          {/* Audit Notes Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Auditor Notes (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Shelf count checked, 2 boxes water damaged"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            {/* Quick note suggestion chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickNotes.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setNotes(qn);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700/80 transition"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 safe-bottom">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <ClipboardCheck className="w-5 h-5 stroke-[2.5]" />
              <span>{isSaving ? 'Saving Audit...' : 'Confirm Audit & Implement Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
