import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const NUMERIC = ['page', 'limit'];

/**
 * List state (page, limit, search, sort, filters) persisted in the URL so lists are
 * shareable and survive navigation. Changing any filter resets to page 1.
 */
export function useListParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const base = useMemo(() => ({ page: 1, limit: 20, sortOrder: 'desc', ...defaults }), [JSON.stringify(defaults)]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = useMemo(() => {
    const out = { ...base };
    for (const [key, value] of searchParams.entries()) {
      out[key] = NUMERIC.includes(key) ? Number(value) || base[key] : value;
    }
    return out;
  }, [searchParams, base]);

  const setParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const resetsPage = Object.keys(patch).some((k) => k !== 'page');
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '' || value === base[key]) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetsPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, base],
  );

  const clear = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  const activeFilterCount = useMemo(
    () => [...searchParams.keys()].filter((k) => !['page', 'limit', 'sortBy', 'sortOrder', 'view'].includes(k)).length,
    [searchParams],
  );

  return { params, setParams, clear, activeFilterCount };
}
