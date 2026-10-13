import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { useI18n } from '@/i18n';
import { authApi } from '@/api/auth';
import { useToast } from '@/providers/ToastProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { applyServerErrors } from '@/hooks/useApiMutation';
import { makeSchemas } from '@/utils/schemas';
import { Alert, Button, FormField, PasswordInput } from '@/components/ui';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { passwordMinLength } = usePublicSettings();
  const [error, setError] = useState(null);
  useDocumentTitle(t('auth.resetTitle'));

  const schema = useMemo(() => {
    const s = makeSchemas(t, { passwordMinLength });
    return z
      .object({ password: s.password, passwordConfirmation: z.string().min(1, t('validation.required')) })
      .refine((v) => v.password === v.passwordConfirmation, { message: t('validation.passwordsMismatch'), path: ['passwordConfirmation'] });
  }, [t, passwordMinLength]);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', passwordConfirmation: '' } });

  const onSubmit = async (values) => {
    setError(null);
    try {
      const res = await authApi.resetPassword({ token, ...values });
      toast.success(res.message || t('auth.resetSuccess'));
      navigate('/login', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setFieldError)) setError(err.message);
    }
  };

  if (token.length < 10) {
    return (
      <div className="stack">
        <h1 className="auth__title">{t('auth.resetTitle')}</h1>
        <Alert tone="danger">{t('auth.invalidResetLink')}</Alert>
        <Button to="/forgot-password" variant="gold-outline" block>
          {t('auth.sendResetLink')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth__title">{t('auth.resetTitle')}</h1>
      <p className="auth__subtitle">{t('auth.resetSubtitle')}</p>
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label={t('auth.newPassword')} error={errors.password?.message} hint={t('auth.passwordHint', { min: passwordMinLength })} required>
          {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" autoFocus {...register('password')} />}
        </FormField>
        <FormField label={t('auth.confirmPassword')} error={errors.passwordConfirmation?.message} required>
          {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" {...register('passwordConfirmation')} />}
        </FormField>
        <Button type="submit" variant="primary" size="lg" block icon={KeyRound} loading={isSubmitting}>
          {t('auth.resetPassword')}
        </Button>
        <Link to="/login" style={{ textAlign: 'center', fontSize: 13 }}>
          {t('auth.backToLogin')}
        </Link>
      </form>
    </>
  );
}
