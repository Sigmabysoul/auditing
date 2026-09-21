import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useSyncStatus } from '../services/syncManager';
import { pushLocalToSupabase, pullSupabaseToLocal } from '../services/dataSync';
import { triggerHaptic } from '../utils/imageUtils';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  productsCount: number;
  warehousesCount: number;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  productsCount,
  warehousesCount,
}) => {
  const {
    status: syncStatus,
    lastSyncedAt,
    isOnlineSyncEnabled,
    toggleOnlineSync,
    syncNow,
  } = useSyncStatus();

  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const notify = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4500);
  };

  // 1. One-Click Cloud Send & Sync (Push local + Pull changes)
  const handleFullSync = async () => {
    setIsSyncing(true);
    triggerHaptic('light');
    try {
      const res = await syncNow();
      if (res.success) {
        triggerHaptic('success');
        notify('success', 'Phone data successfully synced with Cloud!');
        onDataChanged?.();
      } else {
        triggerHaptic('warning');
        notify('error', res.message || 'Sync failed. Please check internet connection.');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Direct Push local -> Supabase
  const handlePushOnly = async () => {
    setIsSyncing(true);
    triggerHaptic('light');
    try {
      const res = await pushLocalToSupabase();
      if (res.success) {
        triggerHaptic('success');
        notify('success', `Uploaded ${res.productsCount ?? 0} products & audits to Cloud!`);
        onDataChanged?.();
      } else {
        triggerHaptic('warning');
        notify('error', res.message || 'Failed to upload to cloud.');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to upload data.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Direct Pull Supabase -> local
  const handlePullOnly = async () => {
    setIsSyncing(true);
    triggerHaptic('light');
    try {
      const res = await pullSupabaseToLocal();
      if (res.success) {
        triggerHaptic('success');
        notify('success', `Updated mobile with ${res.productsCount ?? 0} items from Cloud!`);
        onDataChanged?.();
      } else {
        triggerHaptic('warning');
        notify('error', res.message || 'Failed to receive cloud data.');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to receive cloud data.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-label="Close sync modal" />

      <section
        className="relative z-10 w-full max-w-lg rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        aria-label="Cloud Sync"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Cloud Sync</h2>
              <p className="text-xs text-muted-foreground">
                Sync data between your phone and laptop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Notification Banner */}
          {notification && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
                notification.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span className="leading-snug">{notification.text}</span>
            </div>
          )}

          {/* Big One-Click Sync Button */}
          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                One-Click Action • {productsCount} Products • {warehousesCount} Warehouses
              </span>
              <h3 className="text-base font-black text-foreground">
                Sync Local Phone Data with Cloud
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Sends your latest products, stock audits, and counts to the cloud so you can immediately see them on your laptop or another device.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFullSync}
              disabled={isSyncing}
              className="w-full py-3.5 px-4 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing with Cloud...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                  <span>Sync Data Now</span>
                </>
              )}
            </button>
          </div>

          {/* Live Status & Connection Info */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio
                  className={`w-4 h-4 ${
                    syncStatus === 'live' ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'
                  }`}
                />
                <span className="text-xs font-bold text-foreground">Automatic Live Sync</span>
              </div>

              {/* Simple Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  toggleOnlineSync(!isOnlineSyncEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isOnlineSyncEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                title="Toggle Automatic Live Sync"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isOnlineSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'live'
                      ? 'bg-emerald-500 animate-ping'
                      : syncStatus === 'syncing'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-muted-foreground'
                  }`}
                />
                <span>
                  {syncStatus === 'live'
                    ? 'Connected & Live'
                    : syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'offline'
                    ? 'Offline'
                    : 'Online Ready'}
                </span>
              </span>

              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>
                  {lastSyncedAt
                    ? `Last: ${new Date(lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Not synced yet'}
                </span>
              </span>
            </div>
          </div>

          {/* Directional Send / Receive Controls */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePushOnly}
              disabled={isSyncing}
              className="p-3.5 rounded-2xl bg-muted/70 hover:bg-muted border border-border text-foreground font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <CloudUpload className="w-5 h-5 text-primary" />
              <span>Send to Cloud</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Upload this phone&apos;s data
              </span>
            </button>

            <button
              type="button"
              onClick={handlePullOnly}
              disabled={isSyncing}
              className="p-3.5 rounded-2xl bg-muted/70 hover:bg-muted border border-border text-foreground font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <CloudDownload className="w-5 h-5 text-blue-500" />
              <span>Receive from Cloud</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Get data from laptop
              </span>
            </button>
          </div>

          {/* Simple Explanation Note (No jargon) */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              Your data is safely kept locally on your phone even without internet. When you click <strong>Sync Data Now</strong>, everything updates in the cloud automatically.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
};
