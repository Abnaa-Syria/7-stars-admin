import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { FormField, Textarea } from './Form';

function useOverlayBehaviour(open, onClose, locked) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !locked) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, locked]);
}

export function Modal({ open, onClose, title, icon, tone, size, children, footer, locked }) {
  const titleId = useId();
  const { t } = useI18n();
  useOverlayBehaviour(open, onClose, locked);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !locked && onClose?.()}>
      <div className={clsx('modal', size && `modal--${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__header">
          <div>
            {icon && <div className={clsx('modal__icon', tone === 'danger' && 'modal__icon--danger')}>{icon}</div>}
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} disabled={locked} aria-label={t('common.close')} />
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer }) {
  const titleId = useId();
  const { t } = useI18n();
  useOverlayBehaviour(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="drawer-overlay" onMouseDown={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer__header">
          <h2 className="drawer__title" id={titleId}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label={t('common.close')} />
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__footer">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

/**
 * Confirmation dialog for destructive/sensitive actions. With `withReason`, a textarea is
 * shown and its value is passed to `onConfirm(reason)`; `reasonRequired` enforces it.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  tone = 'danger',
  loading,
  withReason,
  reasonRequired,
  reasonLabel,
  reasonPlaceholder,
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const missing = reasonRequired && !reason.trim();
  const submit = () => {
    setTouched(true);
    if (missing) return;
    onConfirm(reason.trim() || undefined);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={loading}
      title={title}
      tone={tone}
      icon={tone === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger-solid' : 'primary'} onClick={submit} loading={loading}>
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className="stack">
        {body && <p>{body}</p>}
        {withReason && (
          <FormField label={reasonLabel || t('users.reason')} required={reasonRequired} optional={!reasonRequired} error={touched && missing ? t('validation.required') : undefined}>
            {({ id, invalid }) => (
              <Textarea id={id} invalid={invalid} rows={3} maxLength={1000} value={reason} placeholder={reasonPlaceholder || t('users.reasonPlaceholder')} onChange={(e) => setReason(e.target.value)} />
            )}
          </FormField>
        )}
      </div>
    </Modal>
  );
}
