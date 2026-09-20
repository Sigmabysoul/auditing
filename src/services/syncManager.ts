import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '../db/db';
import { getSupabaseClient, getSupabaseConfig } from './supabase';
import { pushLocalToSupabase, pullSupabaseToLocal } from './dataSync';
import type { Warehouse, Category, Product, WarehouseStock, AuditLog } from '../types';

export type SyncStatus = 'local' | 'connecting' | 'live' | 'syncing' | 'offline' | 'error';

interface SyncManagerState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  isOnlineSyncEnabled: boolean;
}

const STORAGE_KEY_SYNC_ENABLED = 'stockaudit_online_sync_enabled';
const STORAGE_KEY_LAST_SYNCED = 'stockaudit_last_synced_at';

class SyncManager {
  private state: SyncManagerState = {
    status: 'local',
    lastSyncedAt: localStorage.getItem(STORAGE_KEY_LAST_SYNCED),
    errorMessage: null,
    isOnlineSyncEnabled: localStorage.getItem(STORAGE_KEY_SYNC_ENABLED) !== 'false',
  };

  private listeners = new Set<(state: SyncManagerState) => void>();
  private channel: RealtimeChannel | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    this.checkAndConnect();
  }

  public getState(): SyncManagerState {
    return { ...this.state };
  }

  public subscribe(callback: (state: SyncManagerState) => void) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((cb) => cb(currentState));
  }

  private setState(partial: Partial<SyncManagerState>) {
    this.state = { ...this.state, ...partial };
    if (partial.lastSyncedAt !== undefined) {
      if (partial.lastSyncedAt) {
        localStorage.setItem(STORAGE_KEY_LAST_SYNCED, partial.lastSyncedAt);
      } else {
        localStorage.removeItem(STORAGE_KEY_LAST_SYNCED);
      }
    }
    this.notify();
  }

  public toggleOnlineSync(enabled: boolean) {
    localStorage.setItem(STORAGE_KEY_SYNC_ENABLED, String(enabled));
    this.setState({ isOnlineSyncEnabled: enabled });
    if (enabled) {
      this.checkAndConnect();
    } else {
      this.disconnect();
      this.setState({ status: 'local', errorMessage: null });
    }
  }

  private handleOnline() {
    if (this.state.isOnlineSyncEnabled) {
      this.checkAndConnect();
      this.schedulePush();
    }
  }

  private handleOffline() {
    this.disconnect();
    this.setState({ status: 'offline', errorMessage: 'No network connection' });
  }

  public checkAndConnect() {
    if (!navigator.onLine) {
      this.setState({ status: 'offline', errorMessage: 'No network connection' });
      return;
    }

    const config = getSupabaseConfig();
    if (!config.isConfigured || !this.state.isOnlineSyncEnabled) {
      this.setState({ status: 'local', errorMessage: null });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      this.setState({ status: 'local', errorMessage: null });
      return;
    }

    this.connectRealtime();
  }

  private connectRealtime() {
    const client = getSupabaseClient();
    if (!client) return;

    if (this.channel) {
      this.disconnect();
    }

    this.setState({ status: 'connecting', errorMessage: null });

    try {
      const channel = client.channel('public-audit-sync');

      // 1. Warehouses table listener
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warehouses' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new as {
              id: string;
              name: string;
              code: string;
              description?: string | null;
              is_default?: boolean | null;
              created_at?: string;
            };
            const mapped: Warehouse = {
              id: raw.id,
              name: raw.name,
              code: raw.code,
              description: raw.description || undefined,
              isDefault: raw.is_default || false,
              createdAt: raw.created_at || new Date().toISOString(),
            };
            await db.warehouses.put(mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            await db.warehouses.delete((payload.old as { id: string }).id);
          }
          this.setState({ lastSyncedAt: new Date().toISOString() });
        }
      );

      // 2. Categories table listener
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new as {
              id: string;
              name: string;
              color: string;
              description?: string | null;
            };
            const mapped: Category = {
              id: raw.id,
              name: raw.name,
              color: raw.color,
              description: raw.description || undefined,
            };
            await db.categories.put(mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            await db.categories.delete((payload.old as { id: string }).id);
          }
          this.setState({ lastSyncedAt: new Date().toISOString() });
        }
      );

      // 3. Products table listener
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new as {
              id: string;
              name: string;
              sku?: string | null;
              details?: string | null;
              category_id: string;
              image?: string | null;
              unit?: string | null;
              min_stock_threshold?: number | null;
              created_at?: string;
              updated_at?: string;
            };
            const mapped: Product = {
              id: raw.id,
              name: raw.name,
              sku: raw.sku || undefined,
              details: raw.details || undefined,
              categoryId: raw.category_id,
              image: raw.image || undefined,
              unit: raw.unit || 'pcs',
              minStockThreshold: raw.min_stock_threshold ?? undefined,
              createdAt: raw.created_at || new Date().toISOString(),
              updatedAt: raw.updated_at || new Date().toISOString(),
            };
            await db.products.put(mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            await db.products.delete((payload.old as { id: string }).id);
          }
          this.setState({ lastSyncedAt: new Date().toISOString() });
        }
      );

      // 4. Warehouse Stocks table listener
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warehouse_stocks' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new as {
              id: string;
              product_id: string;
              warehouse_id: string;
              stock_number?: number;
              audit_number?: number;
              variance?: number;
              last_audited_at?: string;
              notes?: string | null;
            };
            const mapped: WarehouseStock = {
              id: raw.id,
              productId: raw.product_id,
              warehouseId: raw.warehouse_id,
              stockNumber: raw.stock_number ?? 0,
              auditNumber: raw.audit_number ?? 0,
              variance: raw.variance ?? 0,
              lastAuditedAt: raw.last_audited_at || undefined,
              notes: raw.notes || undefined,
            };
            await db.warehouseStocks.put(mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            await db.warehouseStocks.delete((payload.old as { id: string }).id);
          }
          this.setState({ lastSyncedAt: new Date().toISOString() });
        }
      );

      // 5. Audit Logs table listener
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new as {
              id: string;
              product_id: string;
              product_name: string;
              warehouse_id: string;
              warehouse_name: string;
              previous_stock?: number;
              audited_stock?: number;
              variance?: number;
              notes?: string | null;
              timestamp?: string;
              is_applied_to_stock_app?: boolean | null;
              applied_at?: string | null;
            };
            const mapped: AuditLog = {
              id: raw.id,
              productId: raw.product_id,
              productName: raw.product_name,
              warehouseId: raw.warehouse_id,
              warehouseName: raw.warehouse_name,
              previousStock: raw.previous_stock ?? 0,
              auditedStock: raw.audited_stock ?? 0,
              variance: raw.variance ?? 0,
              notes: raw.notes || undefined,
              timestamp: raw.timestamp || new Date().toISOString(),
              isAppliedToStockApp: raw.is_applied_to_stock_app || false,
              appliedAt: raw.applied_at || undefined,
            };
            await db.auditLogs.put(mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            await db.auditLogs.delete((payload.old as { id: string }).id);
          }
          this.setState({ lastSyncedAt: new Date().toISOString() });
        }
      );

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.setState({ status: 'live', errorMessage: null });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.setState({
            status: 'error',
            errorMessage: err?.message || 'Realtime subscription interrupted',
          });
        }
      });

      this.channel = channel;
    } catch (err) {
      console.error('Failed to subscribe to realtime sync:', err);
      this.setState({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Subscription error',
      });
    }
  }

  public disconnect() {
    if (this.channel) {
      const client = getSupabaseClient();
      if (client) {
        client.removeChannel(this.channel);
      }
      this.channel = null;
    }
  }

  // Debounced auto-push when local mutations happen
  public schedulePush(delayMs = 1200) {
    if (!this.state.isOnlineSyncEnabled || !navigator.onLine) return;
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }

    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.executePush();
    }, delayMs);
  }

  private async executePush() {
    if (!this.state.isOnlineSyncEnabled || !navigator.onLine) return;
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    const previousStatus = this.state.status;
    this.setState({ status: 'syncing' });

    try {
      const res = await pushLocalToSupabase();
      if (res.success) {
        this.setState({
          status: previousStatus === 'error' ? 'live' : previousStatus,
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      } else {
        this.setState({
          status: 'error',
          errorMessage: res.message,
        });
      }
    } catch (err) {
      this.setState({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  // Full bidirectional manual sync
  public async syncNow(): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) {
      this.setState({ status: 'offline', errorMessage: 'Device is offline' });
      return { success: false, message: 'Device is offline. Connect to Wi-Fi or cellular.' };
    }

    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      return { success: false, message: 'Supabase credentials are not configured yet.' };
    }

    this.setState({ status: 'syncing', errorMessage: null });

    try {
      // 1. Push local changes first
      const pushRes = await pushLocalToSupabase();
      if (!pushRes.success) throw new Error(pushRes.message);

      // 2. Pull latest cloud changes
      const pullRes = await pullSupabaseToLocal();
      if (!pullRes.success) throw new Error(pullRes.message);

      // 3. Ensure realtime is subscribed
      if (!this.channel) {
        this.connectRealtime();
      }

      const now = new Date().toISOString();
      this.setState({ status: 'live', lastSyncedAt: now, errorMessage: null });

      return {
        success: true,
        message: 'Sync complete! Local data and Supabase cloud are in sync.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed';
      this.setState({ status: 'error', errorMessage: msg });
      return { success: false, message: msg };
    }
  }
}

export const syncManager = new SyncManager();

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncManagerState>(() => syncManager.getState());

  useEffect(() => {
    return syncManager.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  return {
    ...syncState,
    syncNow: () => syncManager.syncNow(),
    toggleOnlineSync: (enabled: boolean) => syncManager.toggleOnlineSync(enabled),
    schedulePush: (delay?: number) => syncManager.schedulePush(delay),
  };
}

