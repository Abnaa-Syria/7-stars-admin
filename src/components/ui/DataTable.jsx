import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EmptyState, ErrorState, LoadingSkeleton } from './Feedback';

/**
 * Server-driven table.
 * columns: [{ key, header, render?(row), sortKey?, className?, width? }]
 * sort:    { sortBy, sortOrder } — clicking a sortable header calls onSortChange({ sortBy, sortOrder }).
 */
export function DataTable({ columns, rows, query, loading, error, onRetry, rowKey = 'id', onRowClick, sort, onSortChange, empty, filtered }) {
  const isLoading = loading ?? query?.isPending;
  const err = error ?? (query?.isError ? query.error : null);
  const retry = onRetry ?? (query ? () => query.refetch() : undefined);

  if (isLoading) return <LoadingSkeleton columns={Math.min(columns.length, 5)} />;
  if (err) return <ErrorState error={err} onRetry={retry} />;
  if (!rows?.length) return empty || <EmptyState filtered={filtered} />;

  const toggleSort = (key) => {
    if (!onSortChange) return;
    const nextOrder = sort?.sortBy === key && sort?.sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange({ sortBy: key, sortOrder: nextOrder });
  };

  return (
    <div className="table-wrap" style={{ opacity: query?.isFetching && !query?.isPending ? 0.65 : 1, transition: 'opacity 120ms' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = Boolean(col.sortKey && onSortChange);
              const active = sortable && sort?.sortBy === col.sortKey;
              return (
                <th
                  key={col.key}
                  className={clsx(sortable && 'sortable', col.className)}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={sortable ? () => toggleSort(col.sortKey) : undefined}
                  aria-sort={active ? (sort.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.header}
                  {active && <span className="sort-icon">{sort.sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = row?.[rowKey] ?? row?.planId ?? row?.studentId ?? row?.userId ?? `row-${index}`;
            return (
              <tr key={key} className={onRowClick ? 'clickable' : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row, index) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

const LIMITS = [10, 20, 50, 100];

/** meta: { page, limit, total, totalPages } from the API. */
export function Pagination({ meta, onChange }) {
  const { t, dir, formatNumber } = useI18n();
  if (!meta || !meta.total) return null;
  const { page, limit, total, totalPages } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="pagination">
      <span>{t('common.showing', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) })}</span>
      <div className="row">
        <select className="select" value={limit} onChange={(e) => onChange({ limit: Number(e.target.value), page: 1 })} aria-label={t('common.perPage')}>
          {LIMITS.map((l) => (
            <option key={l} value={l}>
              {l} / {t('common.perPage')}
            </option>
          ))}
        </select>
        <div className="pagination__pages">
          <button type="button" className="pagination__page" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })} aria-label={t('common.previous')}>
            <Prev size={15} />
          </button>
          {pageWindow(page, totalPages).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="subtle">
                …
              </span>
            ) : (
              <button key={p} type="button" className={clsx('pagination__page', p === page && 'pagination__page--active')} onClick={() => onChange({ page: p })} aria-current={p === page ? 'page' : undefined}>
                {formatNumber(p)}
              </button>
            ),
          )}
          <button type="button" className="pagination__page" disabled={page >= totalPages} onClick={() => onChange({ page: page + 1 })} aria-label={t('common.next')}>
            <Next size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
