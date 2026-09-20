import React from 'react';
import { Layers, Plus, PackagePlus, Building2, Tag, ArrowDownUp } from 'lucide-react';
import { triggerHaptic } from '../utils/imageUtils';

interface NavbarProps {
  onOpenNewProduct: () => void;
  onOpenNewWarehouse: () => void;
  onOpenNewCategory: () => void;
  onOpenTransfer: () => void;
  totalProductsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewProduct,
  onOpenNewWarehouse,
  onOpenNewCategory,
  onOpenTransfer,
  totalProductsCount,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 safe-top">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <Layers className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-none">StockAudit</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Offline
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {totalProductsCount} {totalProductsCount === 1 ? 'Product' : 'Products'} tracked
            </p>
          </div>
        </div>

        {/* Action Buttons: Transfer (Download/Upload) & Create */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenTransfer();
            }}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 font-semibold text-xs transition"
            title="Download or Upload Data"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transfer</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setMenuOpen(!menuOpen);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create</span>
            </button>

          {/* Quick Create Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    triggerHaptic('light');
                    onOpenNewProduct();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 hover:bg-slate-700/70 active:bg-slate-700 transition"
                >
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">New Product</div>
                    <div className="text-[10px] text-slate-400">Add item & set initial stock</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    triggerHaptic('light');
                    onOpenNewWarehouse();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 hover:bg-slate-700/70 active:bg-slate-700 transition"
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold text-white">New Warehouse</div>
                    <div className="text-[10px] text-slate-400">Add bay, shelf or room</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    triggerHaptic('light');
                    onOpenNewCategory();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-100 hover:bg-slate-700/70 active:bg-slate-700 transition"
                >
                  <Tag className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-white">New Category</div>
                    <div className="text-[10px] text-slate-400">Organize your inventory</div>
                  </div>
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </header>
  );
};
