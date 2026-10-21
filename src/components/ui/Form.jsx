import { forwardRef, useId, useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/i18n';

/** Label + control + hint/error wrapper. The control receives the generated id. */
export function FormField({ label, required, optional, hint, error, className, children, id: idProp }) {
  const generated = useId();
  const id = idProp || generated;
  const { t } = useI18n();
  const control = typeof children === 'function' ? children({ id, invalid: Boolean(error) }) : children;
  return (
    <div className={clsx('field', className)}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="field__required">*</span>}
          {optional && <span className="field__optional">({t('common.optional')})</span>}
        </label>
      )}
      {control}
      {error ? (
        <span className="field__error" role="alert">
          <AlertCircle size={13} />
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ invalid, className, dir, ...rest }, ref) {
  return <input ref={ref} className={clsx('input', invalid && 'input--invalid', className)} dir={dir} aria-invalid={invalid || undefined} {...rest} />;
});

export const PasswordInput = forwardRef(function PasswordInput({ invalid, className, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  return (
    <div className="input-group input-group--password" dir="ltr">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={clsx('input', 'ltr', invalid && 'input--invalid', className)}
        aria-invalid={invalid || undefined}
        autoComplete="current-password"
        {...rest}
      />
      <button type="button" className="input-group__action" onClick={() => setVisible((v) => !v)} aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}>
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

export const Select = forwardRef(function Select({ invalid, className, options = [], placeholder, children, ...rest }, ref) {
  return (
    <select ref={ref} className={clsx('select', invalid && 'input--invalid', className)} aria-invalid={invalid || undefined} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx('textarea', invalid && 'input--invalid', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Checkbox = forwardRef(function Checkbox({ label, indeterminate, className, ...rest }, ref) {
  const setRef = (el) => {
    if (el) el.indeterminate = Boolean(indeterminate);
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  return (
    <label className={clsx('checkbox', className)}>
      <input ref={setRef} type="checkbox" {...rest} />
      {label && <span>{label}</span>}
    </label>
  );
});

export const Switch = forwardRef(function Switch({ label, className, ...rest }, ref) {
  return (
    <label className={clsx('switch', className)}>
      <input ref={ref} type="checkbox" role="switch" {...rest} />
      {label && <span>{label}</span>}
    </label>
  );
});

/** Labelled switch row for settings / preference lists (controlled). */
export function SwitchRow({ label, hint, checked, onChange, disabled }) {
  return (
    <div className="switch-row">
      <div>
        <div className="cell-title">{label}</div>
        {hint && <div className="field__hint">{hint}</div>}
      </div>
      <Switch checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    </div>
  );
}

/** Chip-style multi select (controlled). `value` is an array of option values. */
export function MultiSelect({ options = [], value = [], onChange, disabled, id }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="chip-select" id={id} role="group">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={clsx('chip', active && 'chip--active')}
            aria-pressed={active}
            disabled={disabled || o.disabled}
            onClick={() => toggle(o.value)}
          >
            {o.icon && <o.icon size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
