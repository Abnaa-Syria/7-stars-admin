import clsx from 'clsx';

/** Compact progress bar. `value` is 0–100. */
export function ProgressBar({ value = 0, label, tone, size = 'md', className, showValue = true }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const toneClass =
    tone || (pct >= 80 ? 'success' : pct >= 40 ? 'gold' : pct > 0 ? 'warning' : 'muted');

  return (
    <div className={clsx('progress', size && `progress--${size}`, className)} title={label || `${pct}%`}>
      <div className="progress__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={clsx('progress__fill', `progress__fill--${toneClass}`)} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="progress__value ltr">{Math.round(pct)}%</span>}
    </div>
  );
}
