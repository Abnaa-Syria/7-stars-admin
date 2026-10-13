import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar from './ar';
import en from './en';

const dictionaries = { ar, en };
const STORAGE_KEY = 'ss_admin_locale';
const SUPPORTED = ['ar', 'en'];
const FALLBACK = SUPPORTED.includes(import.meta.env.VITE_DEFAULT_LOCALE) ? import.meta.env.VITE_DEFAULT_LOCALE : 'ar';

let currentLocale = readStoredLocale();

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Locale accessor for non-React modules (HTTP client). */
export function getLocale() {
  return currentLocale;
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined && params[name] !== null ? String(params[name]) : ''));
}

/** Translates a dotted key. Keys containing dots inside a leaf map (e.g. setting keys) can be passed as an array. */
export function translate(locale, key, params, fallback) {
  const dict = dictionaries[locale] || dictionaries[FALLBACK];
  let value = Array.isArray(key) ? key.reduce((node, part) => node?.[part], dict) : lookup(dict, key);
  if (value === undefined && locale !== FALLBACK) {
    value = Array.isArray(key) ? key.reduce((node, part) => node?.[part], dictionaries[FALLBACK]) : lookup(dictionaries[FALLBACK], key);
  }
  if (typeof value !== 'string') return fallback !== undefined ? fallback : Array.isArray(key) ? key.join('.') : key;
  return interpolate(value, params);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(currentLocale);

  useEffect(() => {
    currentLocale = locale;
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage unavailable */
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (SUPPORTED.includes(next)) {
      currentLocale = next;
      setLocaleState(next);
    }
  }, []);

  const value = useMemo(() => {
    const intlLocale = locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
    const t = (key, params, fallback) => translate(locale, key, params, fallback);
    const dateFmt = new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric' });
    const dateTimeFmt = new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const numberFmt = new Intl.NumberFormat(intlLocale);

    const formatDate = (v) => (v ? dateFmt.format(new Date(v)) : t('common.none'));
    const formatDateTime = (v) => (v ? dateTimeFmt.format(new Date(v)) : t('common.none'));
    const formatNumber = (v) => numberFmt.format(Number(v || 0));
    const formatBytes = (bytes) => {
      if (!bytes && bytes !== 0) return t('common.none');
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return `${numberFmt.format(Number(size.toFixed(unit ? 1 : 0)))} ${units[unit]}`;
    };
    const formatRelative = (v) => {
      if (!v) return t('common.never');
      const diff = (Date.now() - new Date(v).getTime()) / 1000;
      if (diff < 60) return t('time.justNow');
      if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });
      if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });
      if (diff < 86400 * 30) return t('time.daysAgo', { n: Math.floor(diff / 86400) });
      return formatDate(v);
    };

    return { locale, dir: locale === 'ar' ? 'rtl' : 'ltr', setLocale, t, formatDate, formatDateTime, formatNumber, formatBytes, formatRelative };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
