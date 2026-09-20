import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  CloudUpload,
  CloudDownload,
  Key,
  Globe,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { exportDatabaseToJson, importDatabaseFromJson } from '../db/db';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  type SupabaseConfig
} from '../services/supabase';
import { pushLocalToSupabase, pullSupabaseToLocal } from '../services/dataSync';
import { triggerHaptic } from '../utils/imageUtils';

interface DataTransferModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  productsCount: number;
  warehousesCount: number;
}

export const DataTransferModal: React.FC<DataTransferModalProps> = ({
  onClose,
  onDataChanged,
  productsCount,
  warehousesCount,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'file' | 'cloud'>('file');

  // File Download / Upload states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase states
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getSupabaseConfig());
  const [inputUrl, setInputUrl] = useState(() => getSupabaseConfig().url);
  const [inputKey, setInputKey] = useState(() => getSupabaseConfig().anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const notify = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. Download JSON
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('light');
      const json = await exportDatabaseToJson();

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `warehouse_audit_data_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      notify('success', 'Data file downloaded! Ready to send to your new phone.');
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to generate download file.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Upload JSON
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('warning');
    if (!window.confirm('Uploading this file will restore your warehouse data. Continue?')) {
      return;
    }

    try {
      setIsImporting(true);
      const text = await file.text();
      await importDatabaseFromJson(text);
      triggerHaptic('success');
      notify('success', 'Data restored successfully on this device!');
      onDataChanged();
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to restore: Invalid backup file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Save Supabase Credentials
  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(inputUrl.trim(), inputKey.trim());
    const updated = getSupabaseConfig();
    setSupabaseConfig(updated);
    triggerHaptic('success');
    notify('success', 'Supabase credentials saved!');
  };

  // 4. Test Supabase Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    triggerHaptic('light');
    const res = await testSupabaseConnection();
    if (res.success) {
      triggerHaptic('success');
      notify('success', res.message);
    } else {
      triggerHaptic('warning');
      notify('error', res.message);
    }
    setIsTesting(false);
  };

  // 5. Push Local to Supabase
  const handlePushToSupabase = async () => {
    setIsSyncing(true);
    triggerHaptic('light');
    const res = await pushLocalToSupabase();
    if (res.success) {
      triggerHaptic('success');
      notify(
        'success',
        `Pushed ${res.productsCount} products and ${res.stocksCount} stock counts to Supabase!`
      );
    } else {
      triggerHaptic('warning');
      notify('error', res.message);
    }
    setIsSyncing(false);
  };

  // 6. Pull Supabase to Local
  const handlePullFromSupabase = async () => {
    triggerHaptic('warning');
    if (
      !window.confirm(
        'Pulling from Supabase will replace your local data with the cloud records. Proceed?'
      )
    ) {
      return;
    }

    setIsSyncing(true);
    const res = await pullSupabaseToLocal();
    if (res.success) {
      triggerHaptic('success');
      notify('success', `Pulled ${res.productsCount} products from Supabase!`);
      onDataChanged();
    } else {
      triggerHaptic('warning');
      notify('error', res.message);
    }
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />

        {/* Modal Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Data Transfer & Cloud Sync</h2>
              <p className="text-[11px] text-slate-400">Download, Upload & Supabase Integration</p>
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

        {/* Subtab navigation */}
        <div className="flex border-b border-slate-800 px-4 pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveSubTab('file');
            }}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'file'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Phone Transfer (Download / Upload)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveSubTab('cloud');
            }}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'cloud'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Supabase & Vercel</span>
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div
            className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {activeSubTab === 'file' ? (
            /* =================== TAB 1: PHONE TO PHONE FILE TRANSFER =================== */
            <div className="space-y-4">
              {/* Main Action Buttons: DOWNLOAD & UPLOAD */}
              <div className="space-y-2.5">
                {/* 1. DOWNLOAD BUTTON */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Download Warehouse Data</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Saves all {productsCount} products, photos & stock across {warehousesCount} stockrooms into 1 file
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Offline JSON
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>{isExporting ? 'Generating file...' : 'Download Data to this Phone'}</span>
                  </button>
                </div>

                {/* 2. UPLOAD BUTTON */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Upload Data to this Phone</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Select a downloaded data file to restore or load on a new phone
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Restore
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleUploadFile}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      fileInputRef.current?.click();
                    }}
                    disabled={isImporting}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>{isImporting ? 'Restoring data...' : 'Select File to Upload & Restore'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Mobile Migration Guide */}
              <div className="bg-slate-850 border border-slate-700/70 rounded-2xl p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>How to transfer your inventory to a new phone:</span>
                </h4>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      1
                    </span>
                    <span>
                      On your current phone, tap <strong className="text-emerald-400">Download Data</strong> above. It downloads your backup file.
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      2
                    </span>
                    <span>
                      Send this downloaded file to your new phone (via <strong>WhatsApp</strong>, <strong>Email</strong>, <strong>Google Drive</strong>, or <strong>Bluetooth</strong>).
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      3
                    </span>
                    <span>
                      Open this app on your new phone, tap <strong className="text-blue-400">Upload Data</strong>, and select the file. Everything (products, photos, stockrooms, audits) restores in seconds!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== TAB 2: SUPABASE & VERCEL =================== */
            <div className="space-y-4">
              {/* Cloud Connection Status Badge */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Supabase Cloud Database</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {supabaseConfig.isConfigured
                      ? `Configured via ${supabaseConfig.source === 'env' ? '.env file' : 'in-app settings'}`
                      : 'Not yet configured (app is in local mode)'}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    supabaseConfig.isConfigured
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}
                >
                  {supabaseConfig.isConfigured ? 'Ready' : 'Local Only'}
                </span>
              </div>

              {/* Push / Pull Cloud Sync Actions (If Configured) */}
              {supabaseConfig.isConfigured && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePushToSupabase}
                    disabled={isSyncing}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow flex flex-col items-center justify-center gap-1 transition disabled:opacity-50"
                  >
                    <CloudUpload className="w-5 h-5" />
                    <span>Push to Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={isSyncing}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition disabled:opacity-50"
                  >
                    <CloudDownload className="w-5 h-5 text-blue-400" />
                    <span>Pull from Supabase</span>
                  </button>
                </div>
              )}

              {/* Supabase Credentials Form */}
              <form
                onSubmit={handleSaveCredentials}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>Supabase Project Credentials</span>
                  </h4>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>Project URL</span>
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span>Anon / Public API Key</span>
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                  >
                    Save Credentials
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !inputUrl || !inputKey}
                    className="py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-650 text-slate-200 font-semibold text-xs border border-slate-600 transition disabled:opacity-40"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </form>

              {/* Vercel & SQL Schema Setup Info */}
              <div className="bg-slate-850 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Vercel & Supabase Ready</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The project includes ready-to-run configurations in the codebase:
                </p>

                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong className="text-white">Database Schema:</strong> Located at <span className="text-emerald-400 font-mono">supabase/schema.sql</span>. Copy and paste it directly into Supabase's SQL Editor to create all tables instantly!
                  </li>
                  <li>
                    <strong className="text-white">Vercel Deployment:</strong> Configured in <span className="text-blue-400 font-mono">vercel.json</span> for zero-config routing. Simply import your GitHub repo on Vercel and click Deploy!
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
