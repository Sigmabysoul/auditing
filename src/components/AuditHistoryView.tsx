import React, { useState } from 'react';
import type { AuditLog } from '../types';
import {
  ClipboardList,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Building2,
  Package,
  Trash2,
  MessageSquare,
  CheckSquare2,
  Square,
} from 'lucide-react';
import { db, toggleAuditLogApplied } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';
import { syncManager } from '../services/syncManager';

interface AuditHistoryViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterDiscrepancyOnly, setFilterDiscrepancyOnly] = useState(false);
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.productName.toLowerCase().includes(search.toLowerCase()) ||
        log.warehouseName.toLowerCase().includes(search.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;
      if (filterDiscrepancyOnly && log.variance === 0) return false;
      if (filterPendingOnly && log.isAppliedToStockApp) return false;
      return true;
    });
  }, [logs, search, filterDiscrepancyOnly, filterPendingOnly]);

  const pendingCount = React.useMemo(() => {
    return logs.filter((l) => !l.isAppliedToStockApp).length;
  }, [logs]);

  const handleToggleApplied = async (logId: string) => {
    triggerHaptic('success');
    await toggleAuditLogApplied(logId);
    syncManager.schedulePush();
    onRefresh();
  };

  const handleClearLogs = async () => {
    triggerHaptic('warning');
    if (window.confirm('Clear all audit activity history? (Current stock counts will remain safe)')) {
      await db.auditLogs.clear();
      syncManager.schedulePush();
      onRefresh();
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3 pb-24 max-w-4xl mx-auto px-2 sm:px-4 pt-3">
      {/* View Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-400 light:text-emerald-700" />
            <span>Audit Activity Trail</span>
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600">
            Verify audit counts & mark each when entered into your official warehouse stock software
          </p>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={handleClearLogs}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 light:hover:text-rose-600 hover:bg-slate-800 light:hover:bg-slate-200 transition"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Segmented Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 light:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, warehouse or notes..."
            className="w-full bg-slate-900 light:bg-white border border-slate-800 light:border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Discrepancies */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterDiscrepancyOnly(!filterDiscrepancyOnly);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              filterDiscrepancyOnly
                ? 'bg-rose-500/20 light:bg-rose-50 text-rose-300 light:text-rose-700 border-rose-500/40 light:border-rose-300'
                : 'bg-slate-900 light:bg-white text-slate-400 light:text-slate-700 border-slate-800 light:border-slate-300 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Discrepancies Only</span>
          </button>

          {/* Filter Needs Entry in Stock App */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterPendingOnly(!filterPendingOnly);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              filterPendingOnly
                ? 'bg-amber-500/20 light:bg-amber-50 text-amber-300 light:text-amber-800 border-amber-500/40 light:border-amber-300'
                : 'bg-slate-900 light:bg-white text-slate-400 light:text-slate-700 border-slate-800 light:border-slate-300 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Needs Entry in Stock App ({pendingCount})</span>
          </button>

          <span className="text-[11px] text-slate-500 light:text-slate-600 ml-auto font-medium">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 light:bg-white rounded-2xl border border-slate-800/80 light:border-slate-200">
          <ClipboardList className="w-8 h-8 text-slate-600 light:text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 light:text-slate-700 font-medium">No audit logs found</p>
          <p className="text-[11px] text-slate-500 light:text-slate-500 mt-0.5">
            Audit any warehouse stock on the Products page to create audit logs.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const isMatch = log.variance === 0;
            const isShortage = log.variance < 0;
            const isApplied = !!log.isAppliedToStockApp;

            return (
              <div
                key={log.id}
                className={`bg-slate-900 light:bg-white border rounded-2xl p-3.5 space-y-2.5 shadow-sm transition-all ${
                  isApplied
                    ? 'border-emerald-500/30 light:border-emerald-300 bg-slate-900/70'
                    : 'border-slate-800/90 light:border-slate-200'
                }`}
              >
                {/* Top: Product, Warehouse, Date and Keyed-into-Stock-App Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-1.5 truncate">
                      <Package className="w-4 h-4 text-blue-400 light:text-blue-600 flex-shrink-0" />
                      <span className="truncate">{log.productName}</span>
                    </h4>
                    <div className="text-[11px] text-slate-400 light:text-slate-600 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-500 light:text-slate-400 flex-shrink-0" />
                      <span className="truncate font-semibold">{log.warehouseName}</span>
                      <span className="text-slate-600 light:text-slate-400">•</span>
                      <Clock className="w-3 h-3 text-slate-500 light:text-slate-400 ml-1" />
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                  </div>

                  {/* USER REQUEST: "i want a little button on the audited product cards the user will click those button when he entry the audit dat in the real stock app" */}
                  <button
                    type="button"
                    onClick={() => handleToggleApplied(log.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 flex-shrink-0 ${
                      isApplied
                        ? 'bg-emerald-500/15 light:bg-emerald-100 text-emerald-400 light:text-emerald-800 border-emerald-500/30 light:border-emerald-400 shadow-sm'
                        : 'bg-slate-800/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700 light:border-slate-300 hover:border-amber-400/60 light:hover:border-amber-500'
                    }`}
                    title={isApplied ? 'Already entered in real stock software' : 'Click when you enter this audit in your official warehouse software'}
                  >
                    {isApplied ? (
                      <>
                        <CheckSquare2 className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
                        <span>Entered in App</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-amber-400 light:text-amber-600" />
                        <span className="text-amber-400 light:text-amber-700">Mark as Entered</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Stock Details & Variance Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 light:border-slate-100 bg-slate-850/40 light:bg-slate-50/70 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                  {/* Previous Stock vs Audited Stock */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 light:text-slate-500 uppercase font-semibold block">
                        Previous Baseline
                      </span>
                      <span className="font-mono font-bold text-slate-300 light:text-slate-700">
                        {log.previousStock}
                      </span>
                    </div>

                    <span className="text-slate-600 light:text-slate-400 font-bold">➔</span>

                    <div>
                      <span className="text-[10px] text-emerald-400 light:text-emerald-700 uppercase font-semibold block">
                        New Count
                      </span>
                      <span className="font-mono font-bold text-emerald-400 light:text-emerald-700">
                        {log.auditedStock}
                      </span>
                    </div>
                  </div>

                  {/* Variance Tag */}
                  <div>
                    {isMatch ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/20 light:border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>±0 Match</span>
                      </span>
                    ) : isShortage ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 light:bg-rose-50 text-rose-400 light:text-rose-700 border border-rose-500/30 light:border-rose-200 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{log.variance} Short</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 light:bg-blue-50 text-blue-400 light:text-blue-700 border border-blue-500/30 light:border-blue-200 text-xs font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{log.variance} Extra</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {log.notes && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 light:text-amber-800 bg-amber-500/10 light:bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-500/20 light:border-amber-200 mt-1">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <span className="italic">{log.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
