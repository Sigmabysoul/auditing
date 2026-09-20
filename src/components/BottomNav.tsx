import React from 'react';
import { Package, Building2, Tag, ClipboardList, Settings } from 'lucide-react';
import type { ActiveTab } from '../types';
import { triggerHaptic } from '../utils/imageUtils';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  discrepanciesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  discrepanciesCount = 0,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Products', icon: Package },
    { id: 'warehouses', label: 'Warehouses', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'logs', label: 'Audits', icon: ClipboardList, badge: discrepanciesCount > 0 ? discrepanciesCount : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 light:bg-white/95 backdrop-blur-md border-t border-slate-800 light:border-slate-200 safe-bottom transition-colors shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onChangeTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 light:text-emerald-700 font-bold scale-105'
                  : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-900 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-emerald-400 light:bg-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
