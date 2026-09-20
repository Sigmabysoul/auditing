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
  MessageSquare
} from 'lucide-react';
import { db } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';

interface AuditHistoryViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterDiscrepancyOnly, setFilterDiscrepancyOnly] = useState(false);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.productName.toLowerCase().includes(search.toLowerCase()) ||
        log.warehouseName.toLowerCase().includes(search.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;
      if (filterDiscrepancyOnly && log.variance === 0) return false;
      return true;
    });
  }, [logs, search, filterDiscrepancyOnly]);

  const handleClearLogs = async () => {
    triggerHaptic('warning');
    if (window.confirm('Clear all audit activity history? (Current stock counts will remain safe)')) {
      await db.auditLogs.clear();
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
    <div className="space-y-3 pb-24 max-w-2xl mx-auto px-4 pt-3">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            <span>Audit Activity Trail</span>
          </h2>
          <p className="text-xs text-slate-400">
            Chronological log of all warehouse physical counts & variances
          </p>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={handleClearLogs}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, warehouse or notes..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterDiscrepancyOnly(!filterDiscrepancyOnly);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              filterDiscrepancyOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Only Show Discrepancies</span>
          </button>

          <span className="text-[11px] text-slate-500 ml-auto font-medium">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">No audit logs found</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Audit any warehouse stock on the Products page to create audit logs.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const isMatch = log.variance === 0;
            const isShortage = log.variance < 0;

            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
              >
                {/* Top: Product, Warehouse, Date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{log.productName}</span>
                    </h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{log.warehouseName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>

                {/* Stock Details & Variance Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 bg-slate-850/40 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                  {/* Previous Stock vs Audited Stock */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Prev Stock
                      </span>
                      <span className="font-mono font-bold text-slate-300">
                        {log.previousStock}
                      </span>
                    </div>

                    <span className="text-slate-600 font-bold">➔</span>

                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                        Audited
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {log.auditedStock}
                      </span>
                    </div>
                  </div>

                  {/* Variance Tag */}
                  <div>
                    {isMatch ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>±0 Match</span>
                      </span>
                    ) : isShortage ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{log.variance} Short</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{log.variance} Extra</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {log.notes && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20 mt-1">
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
