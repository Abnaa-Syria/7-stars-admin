import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from './Button';

/** Debounced search box. Emits only after the user pauses typing. */
export function SearchInput({ value = '', onChange, placeholder, delay = 350 }) {
  const { t } = useI18n();
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, delay);

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="input-group input-group--start">
      <span className="input-group__icon">
        <Search size={16} />
      </span>
      <input className="input" type="search" value={text} placeholder={placeholder || t('common.searchPlaceholder')} onChange={(e) => setText(e.target.value)} aria-label={t('common.search')} />
      {text && (
        <button type="button" className="input-group__action" onClick={() => setText('')} aria-label={t('common.clearFilters')}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Filter toolbar bound to useListParams.
 * filters: [{ key, label, options: [{ value, label }] } | { key, label, type: 'date' }]
 */
export function FilterBar({ params, setParams, clear, activeFilterCount, filters = [], searchPlaceholder, children, end }) {
  const { t } = useI18n();
  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <SearchInput value={params.search || ''} onChange={(search) => setParams({ search })} placeholder={searchPlaceholder} />
      </div>
      {filters.map((f) =>
        f.type === 'date' ? (
          <input key={f.key} type="date" className="input" value={params[f.key] || ''} onChange={(e) => setParams({ [f.key]: e.target.value })} aria-label={f.label} title={f.label} />
        ) : f.type === 'text' ? (
          <input
            key={f.key}
            className={clsx('input', f.ltr && 'ltr')}
            value={params[f.key] || ''}
            placeholder={f.placeholder || f.label}
            onChange={(e) => setParams({ [f.key]: e.target.value })}
            aria-label={f.label}
          />
        ) : (
          <select key={f.key} className="select" value={params[f.key] || ''} onChange={(e) => setParams({ [f.key]: e.target.value })} aria-label={f.label}>
            <option value="">
              {f.label}: {t('common.all')}
            </option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ),
      )}
      {children}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" icon={X} onClick={clear}>
          {t('common.clearFilters')}
        </Button>
      )}
      {end && (
        <>
          <span className="filter-bar__spacer" />
          {end}
        </>
      )}
    </div>
  );
}
