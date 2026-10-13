import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useI18n } from '@/i18n';
import { authApi } from '@/api/auth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { applyServerErrors } from '@/hooks/useApiMutation';
import { makeSchemas } from '@/utils/schemas';
import { Alert, Button, FormField, TextInput } from '@/components/ui';

export default function ForgotPasswordPage() {
  const { t, dir } = useI18n();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  useDocumentTitle(t('auth.forgotTitle'));
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const schema = useMemo(() => z.object({ email: makeSchemas(t).email }), [t]);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    setError(null);
    try {
      const res = await authApi.forgotPassword(email);
      // The API responds identically whether or not the account exists.
      setResult(res.message || t('auth.resetLinkSent'));
    } catch (err) {
      if (!applyServerErrors(err, setFieldError)) setError(err.message);
    }
  };

  return (
    <>
      <h1 className="auth__title">{t('auth.forgotTitle')}</h1>
      <p className="auth__subtitle">{t('auth.forgotSubtitle')}</p>
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {result && <Alert tone="success">{result}</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label={t('auth.identifier')} error={errors.email?.message} required>
          {({ id, invalid }) => <TextInput id={id} invalid={invalid} type="email" className="ltr" autoComplete="email" autoFocus placeholder={t('auth.identifierPlaceholder')} {...register('email')} />}
        </FormField>
        <Button type="submit" variant="primary" size="lg" block icon={Send} loading={isSubmitting}>
          {t('auth.sendResetLink')}
        </Button>
        <Link to="/login" className="row" style={{ justifyContent: 'center', fontSize: 13 }}>
          <Back size={15} />
          {t('auth.backToLogin')}
        </Link>
      </form>
    </>
  );
}
