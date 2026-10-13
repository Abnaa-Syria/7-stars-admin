import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { rolesApi } from '@/api/admin';
import { queryKeys, ACCOUNT_QUERY_PREFIXES } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { P } from '@/utils/permissions';
import { diff, emptyToNull } from '@/utils/schemas';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Checkbox, FormField, PageHeader, QueryState } from '@/components/ui';
import {
  ACCOUNT_KINDS,
  STUDENT_PROFILE_KEYS,
  TEACHER_PROFILE_KEYS,
  cleanNullable,
  isSuperAdminAccount,
  roleLabel,
} from './config';
import {
  AccountFields,
  StudentProfileFields,
  TeacherProfileFields,
  accountDefaults,
  accountSchemaShape,
  studentDefaults,
  studentSchemaShape,
  teacherDefaults,
  teacherSchemaShape,
} from './AccountFormFields';

function defaultsFor(kind, account, mode) {
  return {
    ...accountDefaults(account, mode),
    ...(kind !== 'student' ? teacherDefaults(account?.teacherProfile) : {}),
    ...(kind !== 'teacher' ? studentDefaults(account?.studentProfile) : {}),
    ...(kind === 'user' ? { roleIds: account?.roles?.map((r) => r.id) || [] } : {}),
  };
}

function pickProfile(values, keys) {
  const out = cleanNullable(values, keys);
  if ('yearsOfExperience' in out && out.yearsOfExperience !== null) out.yearsOfExperience = Number(out.yearsOfExperience);
  if ('isPublic' in out) out.isPublic = Boolean(out.isPublic);
  return out;
}

function buildPayload(kind, values, { mode, original, selectedRoles }) {
  const account = emptyToNull(
    {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      preferredLanguage: values.preferredLanguage,
      timezone: values.timezone,
      markEmailVerified: values.markEmailVerified,
    },
    ['phone'],
  );
  if (mode === 'create') {
    account.password = values.password;
    account.status = values.status;
    account.sendVerificationEmail = values.sendVerificationEmail;
  } else if (values.newPassword) {
    account.newPassword = values.newPassword;
  }

  if (kind === 'teacher') Object.assign(account, pickProfile(values, TEACHER_PROFILE_KEYS));
  if (kind === 'student') Object.assign(account, pickProfile(values, STUDENT_PROFILE_KEYS));

  if (kind === 'user') {
    account.roleIds = values.roleIds;
    const slugs = new Set((selectedRoles || []).map((r) => r.slug));
    if (mode === 'create' && slugs.has('teacher')) account.teacherProfile = pickProfile(values, TEACHER_PROFILE_KEYS);
    if (mode === 'create' && slugs.has('student')) account.studentProfile = pickProfile(values, STUDENT_PROFILE_KEYS);
  }

  if (mode === 'edit' && original) {
    const prev = defaultsFor(kind, original, 'edit');
    const changed = diff(account, { ...emptyToNull({ fullName: prev.fullName, email: prev.email, phone: prev.phone, preferredLanguage: prev.preferredLanguage, timezone: prev.timezone, markEmailVerified: prev.markEmailVerified }, ['phone']), ...(kind === 'teacher' ? pickProfile(prev, TEACHER_PROFILE_KEYS) : {}), ...(kind === 'student' ? pickProfile(prev, STUDENT_PROFILE_KEYS) : {}) });
    if (values.newPassword) changed.newPassword = values.newPassword;
    if (kind === 'user') {
      const prevIds = (original.roles || []).map((r) => r.id);
      if (JSON.stringify(values.roleIds) !== JSON.stringify(prevIds)) changed.roleIds = values.roleIds;
    }
    return changed;
  }
  return account;
}

export default function AccountFormPage({ kind, mode }) {
  const cfg = ACCOUNT_KINDS[kind];
  const { t, dir } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me, can } = useAuth();
  const { passwordMinLength } = usePublicSettings();
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const detailQuery = useQuery({
    queryKey: cfg.detailKey(id),
    queryFn: () => cfg.api.get(id).then((r) => r.data),
    enabled: mode === 'edit' && Boolean(id),
  });
  const account = mode === 'edit' ? detailQuery.data : null;
  const isSelf = Boolean(account && me?.id === account.id);
  const protectedTarget = isSuperAdminAccount(account) && !me?.isSuperAdmin;

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles({ limit: 100 }),
    queryFn: () => rolesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: kind === 'user' && can(P.ROLES_READ),
    staleTime: 5 * 60_000,
  });

  const schema = useMemo(() => {
    const shape = accountSchemaShape(t, { mode, passwordMinLength });
    if (kind === 'user') shape.roleIds = z.array(z.string().uuid()).min(1, t('validation.selectOne'));
    if (kind === 'teacher' || kind === 'user') Object.assign(shape, teacherSchemaShape(t));
    if (kind === 'student' || kind === 'user') Object.assign(shape, studentSchemaShape(t));
    return z.object(shape);
  }, [t, mode, passwordMinLength, kind]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(kind, account, mode),
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, errors },
  } = form;

  useEffect(() => {
    if (mode === 'edit' && account) reset(defaultsFor(kind, account, mode));
  }, [account, kind, mode, reset]);

  const roleIds = useWatch({ control, name: 'roleIds' }) || [];
  const selectedRoles = (rolesQuery.data || []).filter((r) => roleIds.includes(r.id));
  const showTeacher = kind === 'teacher' || (kind === 'user' && selectedRoles.some((r) => r.slug === 'teacher'));
  const showStudent = kind === 'student' || (kind === 'user' && selectedRoles.some((r) => r.slug === 'student'));

  const mutation = useApiMutation((payload) => (mode === 'create' ? cfg.api.create(payload) : cfg.api.update(id, payload)), {
    invalidate: ACCOUNT_QUERY_PREFIXES,
    onSuccess: (res) => navigate(`${cfg.base}/${res.data.id}`),
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildPayload(kind, values, { mode, original: account, selectedRoles: kind === 'user' ? selectedRoles : account?.roles });
    if (mode === 'edit' && !Object.keys(payload).length) {
      navigate(`${cfg.base}/${id}`);
      return;
    }
    try {
      await mutation.mutateAsync(payload);
    } catch (err) {
      applyServerErrors(err, setError);
    }
  });

  const crumbs = [
    { label: t(`${cfg.ns}.title`), to: cfg.base },
    { label: mode === 'create' ? t(`${cfg.ns}.createTitle`) : account?.fullName || t('common.edit') },
  ];
  const locked = isSelf || protectedTarget || account?.status === 'DELETED';

  const formBody = (
    <form onSubmit={onSubmit} className="stack-lg" noValidate>
      {isSelf && <Alert tone="info">{t('users.selfEditHint')}</Alert>}
      {protectedTarget && <Alert tone="warning">{t('users.protectedHint')}</Alert>}
      {account?.status === 'DELETED' && <Alert tone="danger">{t(`enums.status.DELETED`)}</Alert>}

      <Card>
        <CardHeader title={t('users.accountSection')} />
        <CardBody>
          <AccountFields form={form} mode={mode} passwordMinLength={passwordMinLength} isSelf={isSelf} />
        </CardBody>
      </Card>

      {kind === 'user' && (
        <Card>
          <CardHeader title={t('users.rolesSection')} subtitle={t('users.rolesHint')} />
          <CardBody>
            <FormField label={t('users.roles')} error={errors.roleIds?.message} required>
              {() => (
                <Controller
                  control={control}
                  name="roleIds"
                  render={({ field }) => (
                    <div className="stack-sm">
                      {(rolesQuery.data || []).map((role) => {
                        const blocked = (role.slug === 'super-admin' && !me?.isSuperAdmin) || (role.isSystem === false && !can(P.PERMISSIONS_ASSIGN) && !field.value.includes(role.id));
                        return (
                          <Checkbox
                            key={role.id}
                            label={roleLabel(t, role)}
                            checked={field.value.includes(role.id)}
                            disabled={locked || blocked || isSelf}
                            onChange={(e) => {
                              const next = e.target.checked ? [...field.value, role.id] : field.value.filter((x) => x !== role.id);
                              field.onChange(next);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                />
              )}
            </FormField>
          </CardBody>
        </Card>
      )}

      {showTeacher && (
        <Card>
          <CardHeader title={t('teachers.professionalProfile')} />
          <CardBody>
            <TeacherProfileFields form={form} />
          </CardBody>
        </Card>
      )}

      {showStudent && (
        <Card>
          <CardHeader title={t('students.studentProfile')} />
          <CardBody>
            <StudentProfileFields form={form} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardFooter>
          <Button variant="ghost" icon={Back} to={mode === 'edit' ? `${cfg.base}/${id}` : cfg.base}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" icon={Save} loading={isSubmitting || mutation.isPending} disabled={account?.status === 'DELETED' || protectedTarget}>
            {mode === 'create' ? t('common.create') : t('common.saveChanges')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );

  return (
    <div className="stack-lg">
      <PageHeader title={mode === 'create' ? t(`${cfg.ns}.createTitle`) : t(`${cfg.ns}.editTitle`)} breadcrumbs={crumbs} />
      {mode === 'edit' ? (
        <QueryState query={detailQuery} skeleton={<Card><CardBody><div className="skeleton" style={{ height: 240 }} /></CardBody></Card>}>
          {() => formBody}
        </QueryState>
      ) : (
        formBody
      )}
    </div>
  );
}
