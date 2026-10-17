import { useI18n } from '@/i18n';
import { FormField, TextInput, Textarea } from './Form';

/**
 * Arabic + English inputs for one translatable field.
 * Registers `${name}Ar` and `${name}En` on the given react-hook-form instance.
 */
export function BilingualField({ form, name, label, required, multiline, rows = 3, hint }) {
  const { t } = useI18n();
  const errors = form.formState.errors;
  const Control = multiline ? Textarea : TextInput;
  const extra = multiline ? { rows } : {};
  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <FormField
        className="grow"
        label={`${label} — ${t('common.arabic')}`}
        required={required}
        hint={hint}
        error={errors[`${name}Ar`]?.message}
      >
        <Control dir="rtl" {...extra} {...form.register(`${name}Ar`)} />
      </FormField>
      <FormField
        className="grow"
        label={`${label} — ${t('common.english')}`}
        error={errors[`${name}En`]?.message}
      >
        <Control dir="ltr" {...extra} {...form.register(`${name}En`)} />
      </FormField>
    </div>
  );
}

/** Builds `{ titleAr, titleEn, ... }` form values from an API row (which returns `titleAr`/`titleEn`). */
export function bilingualDefaults(row, fields) {
  const out = {};
  for (const f of fields) {
    out[`${f}Ar`] = row?.[`${f}Ar`] ?? row?.[f] ?? '';
    out[`${f}En`] = row?.[`${f}En`] ?? '';
  }
  return out;
}

/** Trims bilingual form values into an API payload; empty strings become null. */
export function bilingualPayload(values, fields) {
  const out = {};
  for (const f of fields) {
    for (const suffix of ['Ar', 'En']) {
      const v = values[`${f}${suffix}`];
      out[`${f}${suffix}`] = typeof v === 'string' ? v.trim() || null : v ?? null;
    }
  }
  return out;
}
