import React, { useState } from 'react';
import { Check, Palette, RotateCcw, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { THEME_PRESETS, type ThemePreset } from '../types/themePresets';
import { triggerHaptic } from '../utils/imageUtils';

export const ThemeSelectorModal: React.FC = () => {
  const { theme, setTheme, resetTheme, isThemeModalOpen, setIsThemeModalOpen } = useTheme();
  const [filterMode, setFilterMode] = useState<'all' | 'light' | 'dark'>('all');

  if (!isThemeModalOpen) return null;

  const filteredPresets = THEME_PRESETS.filter((p) => {
    if (filterMode === 'all') return true;
    return p.mode === filterMode;
  });

  const handleSelectTheme = (preset: ThemePreset) => {
    triggerHaptic('light');
    setTheme(preset.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => setIsThemeModalOpen(false)}
        aria-label="Close modal"
      />

      <section
        className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        aria-label="Workspace theme picker"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Workspace Themes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose a handcrafted palette inspired by the replacement desk app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close theme editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Mode Tabs (All / Light / Dark) */}
        <div className="px-4 sm:px-5 pt-3 flex items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterMode('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterMode === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({THEME_PRESETS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterMode('light');
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterMode === 'light'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setFilterMode('dark');
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterMode === 'dark'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark</span>
            </button>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground hidden xs:inline">
            Active: <strong className="text-foreground">{theme.name}</strong>
          </span>
        </div>

        {/* Presets Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[60vh]">
          {(['light', 'dark'] as const).map((mode) => {
            const presetsInMode = filteredPresets.filter((p) => p.mode === mode);
            if (presetsInMode.length === 0) return null;

            return (
              <div key={mode} className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  {mode === 'light' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>{mode} themes</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {presetsInMode.map((preset) => {
                    const isSelected = preset.id === theme.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectTheme(preset)}
                        className={`relative rounded-2xl border p-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/25 bg-muted shadow-sm'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        {/* Palette Color Swatches Preview */}
                        <div
                          className="mb-2.5 flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-2.5 shadow-inner"
                          style={{ backgroundColor: preset.colors.background }}
                        >
                          <span
                            className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: preset.colors.primary }}
                            title="Primary accent"
                          />
                          <span
                            className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: preset.colors.secondary }}
                            title="Secondary tone"
                          />
                          <span
                            className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: preset.colors.tertiary }}
                            title="Tertiary tone"
                          />
                          <span
                            className="ml-auto w-4 h-4 rounded-full border border-black/10 shadow-sm flex-shrink-0"
                            style={{ backgroundColor: preset.colors.surface }}
                            title="Surface / Card"
                          />
                        </div>

                        {/* Title & Check */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-foreground">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: preset.colors.primary }}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground line-clamp-1">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              resetTheme();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThemeModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-md active:scale-95 transition"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
};

