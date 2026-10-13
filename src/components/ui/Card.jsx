import clsx from 'clsx';

export function Card({ className, children, ...rest }) {
  return (
    <section className={clsx('card', className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, actions, children }) {
  return (
    <header className="card__header">
      <div className="grow">
        {title && (
          <h3 className="card__title">
            {Icon && <Icon size={18} />}
            {title}
          </h3>
        )}
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </header>
  );
}

export function CardBody({ flush, className, children }) {
  return <div className={clsx('card__body', flush && 'card__body--flush', className)}>{children}</div>;
}

export function CardFooter({ children }) {
  return <footer className="card__footer">{children}</footer>;
}

/** Metric card. `value` must come from a real API response. */
export function StatCard({ label, value, hint, icon: Icon, tone, loading }) {
  return (
    <div className={clsx('stat-card', tone && `stat-card--${tone}`)}>
      <div className="stat-card__head">
        <span className="stat-card__label">{label}</span>
        {Icon && (
          <span className="stat-card__icon">
            <Icon size={19} />
          </span>
        )}
      </div>
      <div className="stat-card__value">{loading ? <span className="skeleton" style={{ width: 70, height: 30 }} /> : value}</div>
      {hint && <div className="stat-card__hint">{hint}</div>}
    </div>
  );
}
