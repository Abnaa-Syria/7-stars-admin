import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useI18n } from '@/i18n';
import { makeSchemas } from '@/utils/schemas';
import { Checkbox, FormField, PasswordInput, Select, Switch, TextInput, Textarea } from '@/components/ui';
import { LANGUAGES } from './config';

const FALLBACK_TIMEZONES = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Muscat', 'Africa/Cairo', 'Asia/Amman', 'Europe/London', 'UTC'];

export function useTimezones() {
  return useMemo(() => {
    try {
      const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_TIMEZONES;
      return list.includes('UTC') ? list : [...list, 'UTC'];
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }, []);
}

/** Account-level schema for create (`password` required) or edit (`newPassword` optional). */
export function accountSchemaShape(t, { mode, passwordMinLength }) {
  const s = makeSchemas(t, { passwordMinLength });
  const shape = {
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    preferredLanguage: z.enum(LANGUAGES),
    timezone: z.string().trim().min(1, t('validation.required')).max(64),
    markEmailVerified: z.boolean(),
  };
  if (mode === 'create') {
    shape.password = s.password;
    shape.status = z.enum(['ACTIVE', 'PENDING_VERIFICATION']);
    shape.sendVerificationEmail = z.boolean();
  } else {
    shape.newPassword = s.optionalPassword;
  }
  return shape;
}

export function teacherSchemaShape(t) {
  const s = makeSchemas(t);
  return {
    displayName: s.optionalText(150),
    displayNameEn: s.optionalText(150),
    headline: s.optionalText(200),
    headlineEn: s.optionalText(200),
    biography: s.optionalText(5000),
    biographyEn: s.optionalText(5000),
    specialization: s.optionalText(150),
    specializationEn: s.optionalText(150),
    yearsOfExperience: s.intInRange(0, 80, { nullable: true }),
    institution: s.optionalText(200),
    institutionEn: s.optionalText(200),
    publicProfileSlug: s.slug,
    isPublic: z.boolean(),
  };
}

export function studentSchemaShape(t) {
  const s = makeSchemas(t);
  return {
    displayName: s.optionalText(150),
    bio: s.optionalText(2000),
    institution: s.optionalText(200),
    gradeLevel: s.optionalText(100),
    birthDate: z
      .string()
      .optional()
      .refine((v) => !v || (new Date(v) <= new Date() && new Date(v).getFullYear() >= 1900), t('validation.invalidDate')),
  };
}

export const accountDefaults = (account, mode) => ({
  fullName: account?.fullName || '',
  email: account?.email || '',
  phone: account?.phone || '',
  preferredLanguage: account?.preferredLanguage || 'ar',
  timezone: account?.timezone || 'Asia/Riyadh',
  markEmailVerified: mode === 'create' ? true : Boolean(account?.emailVerifiedAt),
  ...(mode === 'create' ? { password: '', status: 'ACTIVE', sendVerificationEmail: false } : { newPassword: '' }),
});

const arOf = (p, f) => (p ? (p[`${f}Ar`] ?? p[f] ?? '') : '');

export const teacherDefaults = (p) => ({
  displayName: arOf(p, 'displayName'),
  displayNameEn: p?.displayNameEn || '',
  headline: arOf(p, 'headline'),
  headlineEn: p?.headlineEn || '',
  biography: arOf(p, 'biography'),
  biographyEn: p?.biographyEn || '',
  specialization: arOf(p, 'specialization'),
  specializationEn: p?.specializationEn || '',
  yearsOfExperience: p?.yearsOfExperience ?? '',
  institution: arOf(p, 'institution'),
  institutionEn: p?.institutionEn || '',
  publicProfileSlug: p?.publicProfileSlug || '',
  isPublic: Boolean(p?.isPublic),
});

export const studentDefaults = (p) => ({
  displayName: p?.displayName || '',
  bio: p?.bio || '',
  institution: p?.institution || '',
  gradeLevel: p?.gradeLevel || '',
  birthDate: p?.birthDate || '',
});

export function AccountFields({ form, mode, passwordMinLength, isSelf }) {
  const { t } = useI18n();
  const timezones = useTimezones();
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const markVerified = watch('markEmailVerified');

  return (
    <div className="form-grid">
      <FormField label={t('users.fullName')} error={errors.fullName?.message} required>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} autoComplete="off" {...register('fullName')} />}
      </FormField>
      <FormField label={t('users.email')} error={errors.email?.message} required>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} type="email" className="ltr" autoComplete="off" {...register('email')} />}
      </FormField>
      <FormField label={t('users.phone')} error={errors.phone?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} type="tel" className="ltr" placeholder="+9665XXXXXXXX" {...register('phone')} />}
      </FormField>
      <FormField label={t('users.language')} error={errors.preferredLanguage?.message}>
        {({ id }) => <Select id={id} options={LANGUAGES.map((l) => ({ value: l, label: t(`enums.language.${l}`) }))} {...register('preferredLanguage')} />}
      </FormField>
      <FormField label={t('users.timezone')} error={errors.timezone?.message}>
        {({ id, invalid }) => (
          <Select id={id} invalid={invalid} className="ltr" {...register('timezone')}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {mode === 'create' ? (
        <>
          <FormField label={t('users.initialStatus')} error={errors.status?.message}>
            {({ id }) => <Select id={id} options={['ACTIVE', 'PENDING_VERIFICATION'].map((s) => ({ value: s, label: t(`enums.status.${s}`) }))} {...register('status')} />}
          </FormField>
          <FormField label={t('users.password')} error={errors.password?.message} hint={t('auth.passwordHint', { min: passwordMinLength })} required className="full">
            {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" {...register('password')} />}
          </FormField>
        </>
      ) : (
        <FormField label={t('users.newPassword')} error={errors.newPassword?.message} hint={t('users.newPasswordHint')} optional className="full">
          {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" disabled={isSelf} {...register('newPassword')} />}
        </FormField>
      )}
      <div className="full stack-sm">
        <Controller control={control} name="markEmailVerified" render={({ field }) => <Checkbox label={t('users.markEmailVerified')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} />
        {mode === 'create' && !markVerified && (
          <Controller
            control={control}
            name="sendVerificationEmail"
            render={({ field }) => <Checkbox label={t('users.sendVerificationEmail')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
          />
        )}
      </div>
    </div>
  );
}

export function TeacherProfileFields({ form }) {
  const { t } = useI18n();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const pair = (name, labelKey, { multiline = false } = {}) => {
    const Control = multiline ? Textarea : TextInput;
    const extra = multiline ? { rows: 5 } : {};
    const cls = multiline ? 'full' : undefined;
    return (
      <>
        <FormField label={`${t(labelKey)} — ${t('common.arabic')}`} error={errors[name]?.message} optional className={cls}>
          {({ id, invalid }) => <Control id={id} invalid={invalid} dir="rtl" {...extra} {...register(name)} />}
        </FormField>
        <FormField label={`${t(labelKey)} — ${t('common.english')}`} error={errors[`${name}En`]?.message} optional className={cls}>
          {({ id, invalid }) => <Control id={id} invalid={invalid} dir="ltr" {...extra} {...register(`${name}En`)} />}
        </FormField>
      </>
    );
  };
  return (
    <div className="form-grid">
      {pair('displayName', 'teachers.displayName')}
      {pair('headline', 'teachers.headline')}
      {pair('specialization', 'teachers.specialization')}
      <FormField label={t('teachers.yearsOfExperience')} error={errors.yearsOfExperience?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} type="number" min={0} max={80} inputMode="numeric" {...register('yearsOfExperience')} />}
      </FormField>
      {pair('institution', 'teachers.institution')}
      <FormField label={t('teachers.publicProfileSlug')} error={errors.publicProfileSlug?.message} hint={t('validation.slug')} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} className="ltr" placeholder="dr-ahmad" {...register('publicProfileSlug')} />}
      </FormField>
      {pair('biography', 'teachers.biography', { multiline: true })}
      <div className="full">
        <Controller control={control} name="isPublic" render={({ field }) => <Switch label={t('teachers.isPublic')} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} />
      </div>
    </div>
  );
}

export function StudentProfileFields({ form }) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = form;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="form-grid">
      <FormField label={t('students.displayName')} error={errors.displayName?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} {...register('displayName')} />}
      </FormField>
      <FormField label={t('students.institution')} error={errors.institution?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} {...register('institution')} />}
      </FormField>
      <FormField label={t('students.gradeLevel')} error={errors.gradeLevel?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} {...register('gradeLevel')} />}
      </FormField>
      <FormField label={t('students.birthDate')} error={errors.birthDate?.message} optional>
        {({ id, invalid }) => <TextInput id={id} invalid={invalid} type="date" max={today} min="1900-01-01" {...register('birthDate')} />}
      </FormField>
      <FormField label={t('students.bio')} error={errors.bio?.message} optional className="full">
        {({ id, invalid }) => <Textarea id={id} invalid={invalid} rows={4} {...register('bio')} />}
      </FormField>
    </div>
  );
}
