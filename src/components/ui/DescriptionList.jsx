import clsx from 'clsx';

/** Key/value grid. items: [{ label, value, hidden?, full? }] — empty values render as "—". */
export function DescriptionList({ items = [], single }) {
  return (
    <dl className={clsx('kv', single && 'kv--single')} style={{ margin: 0 }}>
      {items
        .filter((i) => !i.hidden)
        .map((item) => (
          <div key={item.label} className="kv__item" style={item.full ? { gridColumn: '1 / -1' } : undefined}>
            <dt className="kv__label">{item.label}</dt>
            <dd className="kv__value" style={{ margin: 0 }}>
              {item.value === null || item.value === undefined || item.value === '' ? <span className="subtle">—</span> : item.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** Read-only JSON block for audit payloads. */
export function JsonView({ value }) {
  if (value === null || value === undefined) return <span className="subtle">—</span>;
  return <pre className="json">{JSON.stringify(value, null, 2)}</pre>;
}
