import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  type ThemeId,
  type ThemePreset,
} from '../types/themePresets';

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (themeId: ThemeId) => void;
  resetTheme: () => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: getTheme(DEFAULT_THEME_ID),
  setTheme: () => {},
  resetTheme: () => {},
  isThemeModalOpen: false,
  setIsThemeModalOpen: () => {},
});

const STORAGE_KEY = 'stockaudit_theme_preset_id';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isThemeId(saved)) return saved;
      // If legacy setting was 'light', default to a pleasant light theme like 'warm-sand'
      const legacy = localStorage.getItem('stockaudit_theme');
      if (legacy === 'light') return 'warm-sand';
    } catch {
      // fallback
    }
    return DEFAULT_THEME_ID;
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const theme = useMemo(() => getTheme(themeId), [themeId]);

  useEffect(() => {
    const root = document.documentElement;
    const { colors, mode } = theme;

    // Apply CSS Variables directly so all UI tokens instantly repaint
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', mode === 'light' ? '#ffffff' : '#ffffff');
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', '#ffffff');
    root.style.setProperty('--tertiary', colors.tertiary);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--card', colors.surface);
    root.style.setProperty('--card-foreground', colors.foreground);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', colors.mutedForeground);

    // Support dark / light class on root
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Set mobile browser status bar tint
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.background);

    try {
      localStorage.setItem(STORAGE_KEY, themeId);
      localStorage.setItem('stockaudit_theme', mode);
    } catch {
      // ignore
    }
  }, [theme, themeId]);

  const setTheme = (nextId: ThemeId) => {
    setThemeIdState(nextId);
  };

  const resetTheme = () => {
    setThemeIdState(DEFAULT_THEME_ID);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resetTheme,
        isThemeModalOpen,
        setIsThemeModalOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
