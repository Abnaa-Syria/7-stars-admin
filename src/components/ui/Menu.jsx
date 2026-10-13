import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

/**
 * Dropdown action menu. items: [{ label, icon?, onClick, danger?, disabled?, hidden? } | 'divider']
 * A custom trigger can be passed as `trigger(open, toggle)`.
 */
export function DropdownMenu({ items = [], trigger, label, align }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter((i) => i && (i === 'divider' || !i.hidden));
  const cleaned = visible.filter((item, idx) => item !== 'divider' || (idx > 0 && idx < visible.length - 1 && visible[idx - 1] !== 'divider'));
  if (!cleaned.some((i) => i !== 'divider')) return null;

  const toggle = (e) => {
    e?.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <div className="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger ? trigger(open, toggle) : <Button variant="ghost" size="sm" icon={MoreHorizontal} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={open} />}
      {open && (
        <div className="menu__panel" role="menu" style={align === 'start' ? { insetInlineEnd: 'auto', insetInlineStart: 0 } : undefined}>
          {cleaned.map((item, idx) =>
            item === 'divider' ? (
              <div key={`d-${idx}`} className="menu__divider" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={clsx('menu__item', item.danger && 'menu__item--danger')}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon && <item.icon size={16} />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
