import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, Inbox, RefreshCw, SearchX, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from './Button';

export function Spinner({ large }) {
  return <span className={clsx('spinner', large && 'spinner--lg')} role="status" />;
}

export function PageLoader() {
  return (
    <div className="state" style={{ minHeight: '50vh' }}>
      <Spinner large />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, body, action, filtered }) {
  const { t } = useI18n();
  const FinalIcon = filtered ? SearchX : Icon;
  return (
    <div className="state">
      <span className="state__icon">
        <FinalIcon size={24} />
      </span>
      <div className="state__title">{title || t(filtered ? 'empty.noResults' : 'empty.title')}</div>
      {(body || filtered) && <p className="state__body">{body || t('empty.noResultsHint')}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }) {
  const { t } = useI18n();
  const forbidden = error?.status === 403;
  return (
    <div className="state state--error">
      <span className="state__icon">{forbidden ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}</span>
      <div className="state__title">{title || t(forbidden ? 'errors.forbiddenTitle' : 'errors.loadFailed')}</div>
      {error?.message && <p className="state__body">{error.message}</p>}
      {error?.requestId && <code className="subtle">{error.requestId}</code>}
      {onRetry && !forbidden && (
        <Button size="sm" icon={RefreshCw} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, style }) {
  return <span className="skeleton" style={{ width, height, ...style }} />;
}

export function LoadingSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="skeleton-rows" aria-busy="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="row" style={{ gap: 18 }}>
          <Skeleton width={36} height={36} style={{ borderRadius: '50%' }} />
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} width={`${c === 0 ? 30 : 100 / (columns + 1)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

const ALERT_ICONS = { info: Info, warning: AlertTriangle, danger: AlertTriangle, success: CheckCircle2 };

export function Alert({ tone = 'info', title, children, className }) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div className={clsx('alert', `alert--${tone}`, className)} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={17} />
      <div>
        {title && <div className="cell-title" style={{ marginBottom: 2 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** Renders the right state for a React Query result, or the children when data is ready. */
export function QueryState({ query, skeleton, children }) {
  if (query.isPending) return skeleton || <LoadingSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return children(query.data);
}
