import React, { useState } from 'react';
import {
  Layers,
  Plus,
  PackagePlus,
  Building2,
  Tag,
  ArrowDownUp,
  Loader2,
  AlertCircle,
  Palette,
  RefreshCw,
  Download,
  Package,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { triggerHaptic } from '../utils/imageUtils';
import { useSyncStatus } from '../services/syncManager';
import { useTheme } from '../context/ThemeContext';
import type { Warehouse, ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  discrepanciesCount?: number;
  onOpenNewProduct: () => void;
  onOpenNewWarehouse: () => void;
  onOpenNewCategory: () => void;
  onOpenSync: () => void;
  onOpenInstallApp: () => void;
  totalProductsCount: number;
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  discrepanciesCount = 0,
  onOpenNewProduct,
  onOpenNewWarehouse,
  onOpenNewCategory,
  onOpenSync,
  onOpenInstallApp,
  totalProductsCount,
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { status, syncNow } = useSyncStatus();
  const { theme, setIsThemeModalOpen } = useTheme();
  const [isSyncingTop, setIsSyncingTop] = useState(false);

  const handleTopSync = async () => {
    triggerHaptic('light');
    setIsSyncingTop(true);
    await syncNow();
    setIsSyncingTop(false);
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Products', icon: Package },
    { id: 'warehouses', label: 'Warehouses', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'logs', label: 'Audits', icon: ClipboardList, badge: discrepanciesCount > 0 ? discrepanciesCount : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 light:bg-[#faf9f5]/95 backdrop-blur-md border-b border-slate-800 light:border-[#e7e2d4] px-3 sm:px-6 py-2 safe-top shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Main Row */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Brand + Live Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 light:from-[#d97706] light:to-[#b45309] flex items-center justify-center shadow-md shadow-emerald-500/20 light:shadow-amber-500/20 text-slate-950 light:text-white font-bold flex-shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white light:text-[#1c1917] tracking-tight leading-none">
                  StockAudit
                </span>

                {/* Cloud Sync Status Pill */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenSync();
                  }}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 transition active:scale-95 ${
                    status === 'live'
                      ? 'bg-emerald-500/15 text-emerald-400 light:text-emerald-800 border-emerald-500/30 light:border-emerald-300'
                      : status === 'syncing'
                      ? 'bg-amber-500/15 text-amber-400 light:text-amber-800 border-amber-500/30'
                      : status === 'connecting'
                      ? 'bg-blue-500/15 text-blue-400 light:text-blue-800 border-blue-500/30'
                      : status === 'offline'
                      ? 'bg-rose-500/15 text-rose-400 light:text-rose-800 border-rose-500/30'
                      : status === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 light:bg-[#f3f0e8] text-slate-400 light:text-slate-600 border-slate-700 light:border-[#e7e2d4]'
                  }`}
                  title="Click to view Cloud Sync options"
                >
                  {status === 'live' ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="hidden xs:inline">Live Sync</span>
                      <span className="xs:hidden">Live</span>
                    </>
                  ) : status === 'syncing' ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                      <span>Syncing</span>
                    </>
                  ) : status === 'connecting' ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
                      <span>Connecting</span>
                    </>
                  ) : status === 'offline' ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Offline</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                      <span>Sync Alert</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>Local</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] sm:text-[11px] text-slate-400 light:text-[#78716c] font-medium leading-none mt-1">
                {totalProductsCount} {totalProductsCount === 1 ? 'Product' : 'Products'} registered
              </p>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Solves "in desktop view the bottom bar in mobile was missing, no audit or setting button") */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/70 light:bg-[#f3f0e8] p-1 rounded-2xl border border-slate-700/60 light:border-[#e7e2d4]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onChangeTab(item.id);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 light:bg-[#d97706] text-slate-950 light:text-white shadow-sm'
                      : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-slate-700/50 light:hover:bg-[#e9e4d7]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[9px] font-extrabold text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Warehouse Selector, 1-Click Sync, Theme, Backup, New */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Top Warehouse Selector */}
            <div className="flex items-center gap-1 bg-slate-800/90 light:bg-[#f3f0e8] px-2 py-1 rounded-xl border border-slate-700/80 light:border-[#e7e2d4]">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 light:text-[#d97706] flex-shrink-0" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  triggerHaptic('light');
                  onSelectWarehouse(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-white light:text-[#1c1917] focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[150px] truncate"
                title="Filter by warehouse"
              >
                <option value="all" className="bg-slate-900 light:bg-[#faf9f5] text-white light:text-slate-900">
                  🏢 All Rooms
                </option>
                {warehouses.map((wh) => (
                  <option
                    key={wh.id}
                    value={wh.id}
                    className="bg-slate-900 light:bg-[#faf9f5] text-white light:text-slate-900"
                  >
                    [{wh.code}] {wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Top 1-Click Sync Button */}
            <button
              type="button"
              onClick={handleTopSync}
              disabled={isSyncingTop || status === 'syncing'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 light:bg-[#f3f0e8] light:hover:bg-[#e9e4d7] border border-emerald-500/30 light:border-[#d6cfbf] text-emerald-400 light:text-[#b45309] font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
              title="Sync data with cloud / laptop"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTop || status === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Sync</span>
            </button>

            {/* Workspace Theme Selector Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsThemeModalOpen(true);
              }}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/90 light:bg-[#f3f0e8] hover:bg-slate-800 light:hover:bg-[#e9e4d7] border border-slate-700 light:border-[#e7e2d4] text-foreground transition active:scale-95 shadow-sm"
              title={`Change Theme (Current: ${theme.name})`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <Palette className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
              <span className="hidden xl:inline text-xs font-semibold">{theme.name}</span>
            </button>

            {/* Install / Download App Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenInstallApp();
              }}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 light:bg-[#f3f0e8] hover:bg-slate-800 light:hover:bg-[#e9e4d7] border border-slate-700 light:border-[#e7e2d4] text-slate-200 light:text-[#1c1917] font-semibold text-xs transition active:scale-95"
              title="Install app to desktop / mobile"
            >
              <Download className="w-3.5 h-3.5 text-teal-400 light:text-[#0d9488]" />
              <span>App</span>
            </button>

            {/* Cloud Sync Options Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSync();
              }}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/90 light:bg-[#f3f0e8] hover:bg-slate-800 light:hover:bg-[#e9e4d7] text-slate-200 light:text-[#1c1917] border border-slate-700 light:border-[#e7e2d4] font-semibold text-xs transition active:scale-95"
              title="Cloud Sync Options & History"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-blue-400 light:text-blue-600" />
              <span>Cloud</span>
            </button>

            {/* Create Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setMenuOpen(!menuOpen);
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 light:bg-[#d97706] hover:bg-emerald-400 light:hover:bg-[#b45309] active:scale-95 text-slate-950 light:text-white font-bold text-xs transition shadow-md shadow-emerald-500/25 light:shadow-amber-500/25"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New</span>
              </button>

            {/* Quick Create Dropdown */}
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-800 light:bg-white border border-slate-700 light:border-slate-200 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      triggerHaptic('light');
                      onOpenNewProduct();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 light:text-slate-800 hover:bg-slate-700/70 light:hover:bg-slate-100 transition"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white light:text-slate-900">New Product</div>
                      <div className="text-[10px] text-slate-400 light:text-slate-500">Add item & set stock</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      triggerHaptic('light');
                      onOpenNewWarehouse();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 light:text-slate-800 hover:bg-slate-700/70 light:hover:bg-slate-100 transition"
                  >
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold text-white light:text-slate-900">New Warehouse</div>
                      <div className="text-[10px] text-slate-400 light:text-slate-500">Add bay, shelf or room</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      triggerHaptic('light');
                      onOpenNewCategory();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 light:text-slate-800 hover:bg-slate-700/70 light:hover:bg-slate-100 transition"
                  >
                    <Tag className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white light:text-slate-900">New Category</div>
                      <div className="text-[10px] text-slate-400 light:text-slate-500">Organize your inventory</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </header>
  );
};
