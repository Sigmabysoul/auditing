import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Smartphone,
  HardDrive,
  Layers,
  FileJson,
  ShieldCheck
} from 'lucide-react';
import { exportDatabaseToJson, importDatabaseFromJson, seedInitialDataIfNeeded, db } from '../db/db';
import { triggerHaptic } from '../utils/imageUtils';

interface SettingsViewProps {
  onDataChanged: () => void;
  onOpenTransfer?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataChanged, onOpenTransfer }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('light');
      const json = await exportDatabaseToJson();

      // Create blob and download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `warehouse_audit_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      showNotification('Backup successfully downloaded to your device!');
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to generate backup JSON.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('warning');
    if (!window.confirm('Importing this backup will overwrite existing local data. Continue?')) {
      return;
    }

    try {
      setIsImporting(true);
      const text = await file.text();
      await importDatabaseFromJson(text);
      triggerHaptic('success');
      showNotification('Backup successfully restored!');
      onDataChanged();
    } catch (err) {
      console.error('Failed to import backup:', err);
      alert('Failed to restore backup. Please ensure it is a valid backup file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDemoData = async () => {
    triggerHaptic('warning');
    if (window.confirm('Reset database to sample warehouse demo data? Any unsaved custom items will be overwritten.')) {
      await seedInitialDataIfNeeded(true);
      triggerHaptic('success');
      showNotification('Sample demo data loaded successfully!');
      onDataChanged();
    }
  };

  const handleClearAllData = async () => {
    triggerHaptic('warning');
    if (window.confirm('CAUTION: Are you sure you want to erase ALL products, warehouses, and audit logs? This cannot be undone.')) {
      await db.warehouseStocks.clear();
      await db.auditLogs.clear();
      await db.products.clear();
      await db.categories.clear();
      await db.warehouses.clear();
      triggerHaptic('light');
      showNotification('All local data wiped.');
      onDataChanged();
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-3">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <span>Local Storage & Backup</span>
        </h2>
        <p className="text-xs text-slate-400">
          All data is saved 100% locally on this phone via IndexedDB
        </p>
      </div>

      {/* Success Notification Banner */}
      {statusMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Backup & Restore Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <FileJson className="w-4 h-4 text-emerald-400" />
          <span>Device Backup & Restore</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Create an instant JSON file of your entire inventory, warehouses, and audit logs to keep safe or send to your computer/email.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export JSON'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : 'Import Backup'}</span>
          </button>
        </div>

        {onOpenTransfer && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenTransfer();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Phone-to-Phone Transfer & Supabase Hub →</span>
          </button>
        )}
      </div>

      {/* Sample Demo Data & Maintenance */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Data Maintenance</span>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] border border-slate-700/80 transition"
          >
            <div className="flex items-center gap-2.5 text-left">
              <RotateCcw className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Re-seed Realistic Demo Inventory</div>
                <div className="text-[10px] text-slate-400">Load sample warehouses, products, and counts</div>
              </div>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Load</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllData}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 active:scale-[0.99] border border-rose-500/30 transition"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Trash2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-300">Wipe All Local Data</div>
                <div className="text-[10px] text-rose-400/80">Erase all items, stockrooms, and logs</div>
              </div>
            </div>
            <span className="text-xs text-rose-400 font-semibold">Wipe</span>
          </button>
        </div>
      </div>

      {/* Mobile PWA Installation Guidance */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Use as Mobile App on your Phone</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          For the fastest warehouse workflow without browser address bars:
        </p>

        <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
          <li>
            <strong className="text-white">Chrome on Android:</strong> Tap the 3 dots menu <span className="text-emerald-400">⋮</span> and select <strong className="text-white">&quot;Install app&quot;</strong> or <strong className="text-white">&quot;Add to Home screen&quot;</strong>.
          </li>
          <li>
            <strong className="text-white">Safari on iPhone:</strong> Tap the Share button <span className="text-blue-400">⬆</span> and select <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.
          </li>
          <li>
            <strong className="text-white">Local Network:</strong> If running from your PC, access <span className="font-mono text-emerald-400">http://&lt;your-computer-ip&gt;:5173</span> over your warehouse Wi-Fi!
          </li>
        </ul>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400/90 font-medium">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>Runs 100% offline — zero internet needed during audits.</span>
        </div>
      </div>
    </div>
  );
};

