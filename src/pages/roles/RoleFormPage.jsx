import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { permissionsApi, rolesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { makeSchemas } from '@/utils/schemas';
import { P } from '@/utils/permissions';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, FormField, PageHeader, QueryState, TextInput, Textarea } from '@/components/ui';
import { PermissionEditor } from './PermissionEditor';

export default function RoleFormPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { can } = useAuth();

  const roleQuery = useQuery({ queryKey: queryKeys.role(id), queryFn: () => rolesApi.get(id).then((r) => r.data), enabled: isEdit });
  const permsQuery = useQuery({
    queryKey: queryKeys.permissions,
    queryFn: () => permissionsApi.list().then((r) => r.data),
    enabled: !isEdit && can(P.PERMISSIONS_ASSIGN),
    staleTime: 5 * 60_000,
  });

  const schema = useMemo(() => {
    const s = makeSchemas(t);
    return z.object({
      name: s.required(100, 2),
      slug: s.slug,
      description: s.optionalText(500),
      permissionIds: z.array(z.string().uuid()),
    });
  }, [t]);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', slug: '', description: '', permissionIds: [] } });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (roleQuery.data) {
      reset({
        name: roleQuery.data.name,
        slug: roleQuery.data.slug,
        description: roleQuery.data.description || '',
        permissionIds: (roleQuery.data.permissions || []).map((p) => p.id),
      });
    }
  }, [roleQuery.data, reset]);

  const mutation = useApiMutation(
    (body) => (isEdit ? rolesApi.update(id, body) : rolesApi.create(body)),
    { invalidate: [['roles'], ['role'], ['audit-logs']], onSuccess: (res) => navigate(`/roles/${res.data.id}`) },
  );

  const locked = Boolean(roleQuery.data?.isSystem);
  const onSubmit = handleSubmit(async (values) => {
    const body = isEdit
      ? { name: values.name, description: values.description || null }
      : { name: values.name, slug: values.slug || undefined, description: values.description || null, permissionIds: can(P.PERMISSIONS_ASSIGN) ? values.permissionIds : undefined };
    try {
      await mutation.mutateAsync(body);
    } catch (err) {
      applyServerErrors(err, setError);
    }
  });

  const formBody = (
    <form onSubmit={onSubmit} className="stack-lg" noValidate>
      {locked && <Alert tone="warning">{t('roles.protectedHint')}</Alert>}
      <Card>
        <CardHeader title={isEdit ? t('roles.editTitle') : t('roles.createTitle')} />
        <CardBody>
          <div className="form-grid">
            <FormField label={t('roles.name')} error={errors.name?.message} required>
              {({ id: fid, invalid }) => <TextInput id={fid} invalid={invalid} disabled={locked} {...register('name')} />}
            </FormField>
            <FormField label={t('roles.slug')} error={errors.slug?.message} hint={t('roles.slugHint')} optional>
              {({ id: fid, invalid }) => <TextInput id={fid} invalid={invalid} className="ltr" disabled={isEdit} {...register('slug')} />}
            </FormField>
            <FormField label={t('roles.description')} error={errors.description?.message} optional className="full">
              {({ id: fid, invalid }) => <Textarea id={fid} invalid={invalid} rows={3} disabled={locked} {...register('description')} />}
            </FormField>
          </div>
        </CardBody>
      </Card>
      {!isEdit && can(P.PERMISSIONS_ASSIGN) && (
        <Card>
          <CardHeader title={t('roles.permissions')} />
          <CardBody>
            <PermissionEditor modules={permsQuery.data?.modules || []} value={watch('permissionIds')} onChange={(ids) => setValue('permissionIds', ids, { shouldDirty: true })} />
          </CardBody>
        </Card>
      )}
      <Card>
        <CardFooter>
          <Button variant="ghost" to={isEdit ? `/roles/${id}` : '/roles'}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" icon={Save} loading={isSubmitting || mutation.isPending} disabled={locked}>
            {isEdit ? t('common.saveChanges') : t('common.create')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );

  return (
    <div className="stack-lg">
      <PageHeader
        title={isEdit ? t('roles.editTitle') : t('roles.createTitle')}
        breadcrumbs={[{ label: t('roles.title'), to: '/roles' }, { label: isEdit ? roleQuery.data?.name || t('common.edit') : t('roles.create') }]}
      />
      {isEdit ? <QueryState query={roleQuery}>{() => formBody}</QueryState> : formBody}
    </div>
  );
}
