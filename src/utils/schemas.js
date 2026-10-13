import { z } from 'zod';

/**
 * Localized zod building blocks mirroring the backend validators. Client validation is
 * UX only; the API remains the source of truth and its field errors are mapped back onto forms.
 */
export function makeSchemas(t, { passwordMinLength = 8 } = {}) {
  const required = (max = 191, min = 1) =>
    z
      .string()
      .trim()
      .min(min, min > 1 ? t('validation.minLength', { min }) : t('validation.required'))
      .max(max, t('validation.maxLength', { max }));

  const optionalText = (max) => z.string().trim().max(max, t('validation.maxLength', { max })).optional().or(z.literal(''));

  const email = z.string().trim().min(1, t('validation.required')).email(t('validation.email')).max(191, t('validation.maxLength', { max: 191 }));

  const phone = z
    .string()
    .trim()
    .max(32, t('validation.maxLength', { max: 32 }))
    .refine((v) => !v || /^\+?[\d\s\-()٠-٩]{7,20}$/.test(v), t('validation.phone'))
    .optional()
    .or(z.literal(''));

  const password = z
    .string()
    .min(passwordMinLength, t('validation.minLength', { min: passwordMinLength }))
    .max(128, t('validation.maxLength', { max: 128 }))
    .refine((v) => /\p{L}/u.test(v), t('validation.passwordLetter'))
    .refine((v) => /\p{N}/u.test(v), t('validation.passwordNumber'))
    .refine((v) => /[^\p{L}\p{N}\s]/u.test(v), t('validation.passwordSymbol'));

  const optionalPassword = z.union([z.literal(''), password]).optional();

  const slug = z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), t('validation.slug'))
    .optional()
    .or(z.literal(''));

  const intInRange = (min, max, { nullable = false } = {}) =>
    z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? (nullable ? null : undefined) : Number(v)),
      nullable
        ? z.number({ invalid_type_error: t('validation.number') }).int(t('validation.number')).min(min, t('validation.min', { min })).max(max, t('validation.max', { max })).nullable()
        : z.number({ invalid_type_error: t('validation.number'), required_error: t('validation.required') }).int(t('validation.number')).min(min, t('validation.min', { min })).max(max, t('validation.max', { max })),
    );

  return { required, optionalText, email, phone, password, optionalPassword, slug, intInRange, fullName: required(150, 2) };
}

/** Converts '' to null for nullable API fields and drops undefined. */
export function emptyToNull(obj, keys) {
  const out = { ...obj };
  for (const k of keys) if (out[k] === '') out[k] = null;
  return out;
}

/** Keeps only keys whose value differs from the original (for PATCH payloads). */
export function diff(next, original) {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(original?.[k] ?? null)));
}
