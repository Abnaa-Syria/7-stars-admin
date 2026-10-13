import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { LogOut, Save } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '@/api/auth';
import { profileApi } from '@/api/profile';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { makeSchemas } from '@/utils/schemas';
import {
  AvatarUploader,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  FormField,
  PageHeader,
  PasswordInput,
  Select,
  SwitchRow,
  TextInput,
} from '@/components/ui';
import { SessionsTable } from '@/features/accounts/AccountPanels';
import { LANGUAGES } from '@/features/accounts/config';
import { useTimezones } from '@/features/accounts/AccountFormFields';

const PREF_KEYS = [
  'inAppEnabled',
  'emailEnabled',
  'pushEnabled',
  'courseUpdatesEnabled',
  'quizNotificationsEnabled',
  'achievementNotificationsEnabled',
  'teacherActivityEnabled',
  'joinRequestNotificationsEnabled',
  'billingNotificationsEnabled',
  'marketingEnabled',
];

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, reloadUser } = useAuth();
  const { passwordMinLength, maxUploadSizeMb } = usePublicSettings();
  const timezones = useTimezones();
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  const profileQuery = useQuery({ queryKey: queryKeys.profile, queryFn: () => profileApi.get().then((r) => r.data) });
  const prefsQuery = useQuery({ queryKey: queryKeys.profilePreferences, queryFn: () => profileApi.getPreferences().then((r) => r.data) });
  const sessionsQuery = useQuery({ queryKey: queryKeys.profileSessions, queryFn: () => profileApi.sessions().then((r) => r.data) });
  const profile = profileQuery.data || user;

  const personalSchema = useMemo(() => {
    const s = makeSchemas(t);
    return z.object({ fullName: s.fullName, phone: s.phone, timezone: z.string().min(1), preferredLanguage: z.enum(LANGUAGES) });
  }, [t]);

  const personal = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: { fullName: profile?.fullName || '', phone: profile?.phone || '', timezone: profile?.timezone || 'Asia/Riyadh', preferredLanguage: profile?.preferredLanguage || 'ar' },
  });
  useEffect(() => {
    if (profile) personal.reset({ fullName: profile.fullName, phone: profile.phone || '', timezone: profile.timezone, preferredLanguage: profile.preferredLanguage });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = useApiMutation((body) => profileApi.update(body), {
    invalidate: [['profile'], ['admin-dashboard']],
    onSuccess: () => reloadUser(),
  });

  const avatarUpload = useApiMutation((file) => profileApi.uploadAvatar(file), {
    invalidate: [['profile']],
    onSuccess: () => reloadUser(),
  });
  const avatarRemove = useApiMutation(() => profileApi.removeAvatar(), {
    invalidate: [['profile']],
    onSuccess: () => reloadUser(),
  });

  const passwordSchema = useMemo(() => {
    const s = makeSchemas(t, { passwordMinLength });
    return z
      .object({ currentPassword: z.string().min(1, t('validation.required')), password: s.password, passwordConfirmation: z.string(), logoutOtherSessions: z.boolean() })
      .refine((v) => v.password === v.passwordConfirmation, { message: t('validation.passwordsMismatch'), path: ['passwordConfirmation'] });
  }, [t, passwordMinLength]);

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', password: '', passwordConfirmation: '', logoutOtherSessions: true },
  });
  const changePassword = useApiMutation((body) => authApi.changePassword(body), {
    invalidate: [['profile'], ['profile', 'sessions']],
    onSuccess: () => passwordForm.reset(),
  });

  const savePrefs = useApiMutation((body) => profileApi.updatePreferences(body), { invalidate: [['profile', 'preferences']] });
  const revokeSession = useApiMutation((id) => profileApi.revokeSession(id), { invalidate: [['profile', 'sessions']] });
  const logoutAll = useApiMutation(() => authApi.logoutAll(), {
    invalidate: [['profile', 'sessions']],
    onSuccess: () => setLogoutAllOpen(false),
  });

  const onSavePersonal = personal.handleSubmit(async (values) => {
    try {
      await saveProfile.mutateAsync({ ...values, phone: values.phone || null });
    } catch (err) {
      applyServerErrors(err, personal.setError);
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync(values);
    } catch (err) {
      applyServerErrors(err, passwordForm.setError);
    }
  });

  return (
    <div className="stack-lg">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <Card>
        <CardHeader title={t('profile.personal')} />
        <CardBody>
          <AvatarUploader
            src={profile?.avatar?.url}
            name={profile?.fullName}
            loading={avatarUpload.isPending || avatarRemove.isPending}
            maxMb={maxUploadSizeMb}
            onUpload={(file) => avatarUpload.mutate(file)}
            onRemove={() => avatarRemove.mutate()}
          />
          <form id="personal-form" onSubmit={onSavePersonal} className="form-grid" style={{ marginTop: 18 }} noValidate>
            <FormField label={t('users.fullName')} error={personal.formState.errors.fullName?.message} required>
              {({ id, invalid }) => <TextInput id={id} invalid={invalid} {...personal.register('fullName')} />}
            </FormField>
            <FormField label={t('users.email')}>
              {({ id }) => <TextInput id={id} value={profile?.email || ''} className="ltr" disabled />}
            </FormField>
            <FormField label={t('users.phone')} error={personal.formState.errors.phone?.message} optional>
              {({ id, invalid }) => <TextInput id={id} invalid={invalid} className="ltr" {...personal.register('phone')} />}
            </FormField>
            <FormField label={t('users.language')}>
              {({ id }) => <Select id={id} options={LANGUAGES.map((l) => ({ value: l, label: t(`enums.language.${l}`) }))} {...personal.register('preferredLanguage')} />}
            </FormField>
            <FormField label={t('users.timezone')}>
              {({ id }) => (
                <Select id={id} className="ltr" {...personal.register('timezone')}>
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </form>
        </CardBody>
        <CardFooter>
          <Button type="submit" form="personal-form" variant="primary" icon={Save} loading={saveProfile.isPending}>
            {t('common.saveChanges')}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={t('profile.changePassword')} />
        <form onSubmit={onChangePassword} noValidate>
          <CardBody>
            <div className="form-grid">
              <FormField label={t('profile.currentPassword')} error={passwordForm.formState.errors.currentPassword?.message} required className="full">
                {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="current-password" {...passwordForm.register('currentPassword')} />}
              </FormField>
              <FormField label={t('auth.newPassword')} error={passwordForm.formState.errors.password?.message} hint={t('auth.passwordHint', { min: passwordMinLength })} required>
                {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" {...passwordForm.register('password')} />}
              </FormField>
              <FormField label={t('auth.confirmPassword')} error={passwordForm.formState.errors.passwordConfirmation?.message} required>
                {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" {...passwordForm.register('passwordConfirmation')} />}
              </FormField>
              <div className="full">
                <SwitchRow label={t('profile.logoutOthers')} checked={passwordForm.watch('logoutOtherSessions')} onChange={(v) => passwordForm.setValue('logoutOtherSessions', v)} />
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Button type="submit" variant="primary" loading={changePassword.isPending}>
              {t('profile.changePassword')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('profile.preferences')} />
        <CardBody>
          <div className="stack">
            {PREF_KEYS.map((key) => (
              <SwitchRow
                key={key}
                label={t(`profile.prefs.${key}`)}
                checked={Boolean(prefsQuery.data?.[key])}
                onChange={(checked) => savePrefs.mutate({ [key]: checked })}
                disabled={savePrefs.isPending || prefsQuery.isPending}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('profile.sessions')}
          actions={
            <Button size="sm" variant="danger" icon={LogOut} onClick={() => setLogoutAllOpen(true)}>
              {t('profile.logoutAll')}
            </Button>
          }
        />
        <CardBody flush>
          <SessionsTable query={sessionsQuery} onRevoke={(s) => revokeSession.mutate(s.id)} revokingId={revokeSession.isPending ? revokeSession.variables : null} />
        </CardBody>
      </Card>

      <ConfirmDialog
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        title={t('profile.logoutAll')}
        body={t('users.confirm.revokeBody', { name: user?.fullName })}
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </div>
  );
}
