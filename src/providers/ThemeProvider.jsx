import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ss_admin_theme';
const MODES = ['light', 'dark'];
const THEME_COLORS = { dark: '#0b0b0d', light: '#f4f1ea' };

let currentResolved = 'dark';

function normalizeMode(value) {
  if (value === 'light' || value === 'dark') return value;
  return 'dark';
}

function readStoredMode() {
  try {
    return normalizeMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'dark';
  }
}

function applyDomTheme(theme) {
  currentResolved = theme;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
}

/** Resolved theme for non-React modules. */
export function getResolvedTheme() {
  return currentResolved;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);

  useEffect(() => {
    applyDomTheme(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage unavailable */
    }
  }, [mode]);

  const setMode = useCallback((next) => {
    if (MODES.includes(next)) setModeState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      resolved: mode,
      setMode,
      toggleMode,
      cycleMode: toggleMode,
      isDark: mode === 'dark',
      isLight: mode === 'light',
    }),
    [mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
