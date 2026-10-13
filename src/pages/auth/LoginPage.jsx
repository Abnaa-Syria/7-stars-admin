import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Mail } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { applyServerErrors } from '@/hooks/useApiMutation';
import { Alert, Button, FormField, PasswordInput, TextInput } from '@/components/ui';

export default function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  useDocumentTitle(t('auth.signIn'));

  const schema = useMemo(
    () =>
      z.object({
        identifier: z.string().trim().min(1, t('validation.required')).max(191),
        password: z.string().min(1, t('validation.required')).max(128),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } });

  const onSubmit = async (values) => {
    setError(null);
    try {
      await login(values);
      const target = location.state?.from && location.state.from !== '/login' ? location.state.from : '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setFieldError)) setError(err);
    }
  };

  return (
    <>
      <h1 className="auth__title">{t('auth.welcome')}</h1>
      <p className="auth__subtitle">
        {t('auth.loginSubtitle')
          .split('{app}')
          .flatMap((part, i, arr) =>
            i < arr.length - 1
              ? [
                  part,
                  <span key="app" className="ltr" dir="ltr">
                    {t('common.appName')}
                  </span>,
                ]
              : [part],
          )}
      </p>

      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {location.state?.expired && !error && <Alert tone="warning">{t('auth.sessionExpired')}</Alert>}
        {error && <Alert tone="danger">{error.code === 'NOT_ADMIN' ? t('auth.notAdmin') : error.message}</Alert>}

        <FormField label={t('auth.identifier')} error={errors.identifier?.message} required>
          {({ id, invalid }) => (
            <div className="input-group input-group--start">
              <span className="input-group__icon">
                <Mail size={16} />
              </span>
              <TextInput id={id} invalid={invalid} className="ltr" autoComplete="username" autoFocus placeholder={t('auth.identifierPlaceholder')} {...register('identifier')} />
            </div>
          )}
        </FormField>

        <FormField label={t('auth.password')} error={errors.password?.message} required>
          {({ id, invalid }) => <PasswordInput id={id} invalid={invalid} {...register('password')} />}
        </FormField>

        <div className="row-between">
          <span />
          <Link to="/forgot-password" style={{ fontSize: 13 }}>
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" block icon={LogIn} loading={isSubmitting}>
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </>
  );
}
