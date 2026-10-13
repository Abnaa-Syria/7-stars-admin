import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function Breadcrumbs({ items = [] }) {
  const { dir } = useI18n();
  const Sep = dir === 'rtl' ? ChevronLeft : ChevronRight;
  if (!items.length) return null;
  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {last || !item.to ? <span className={last ? 'breadcrumbs__current' : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
            {!last && <Sep size={13} />}
          </Fragment>
        );
      })}
    </nav>
  );
}

/** Page title block; also sets the document title. */
export function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  useDocumentTitle(typeof title === 'string' ? title : undefined);
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="page-header">
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}

/** Controlled tabs. `tabs`: [{ id, label, icon?, count?, hidden? }] */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs
        .filter((tab) => !tab.hidden)
        .map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={clsx('tab', active === tab.id && 'tab--active')}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <tab.icon size={16} />}
            {tab.label}
            {tab.count !== undefined && tab.count !== null && <span className="tab__count">{tab.count}</span>}
          </button>
        ))}
    </div>
  );
}
