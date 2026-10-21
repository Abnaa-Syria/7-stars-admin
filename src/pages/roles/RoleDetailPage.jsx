import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { permissionsApi, rolesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { roleLabel } from '@/features/accounts/config';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, ConfirmDialog, DescriptionList, PageHeader, QueryState } from '@/components/ui';
import { PermissionEditor } from './PermissionEditor';

export default function RoleDetailPage() {
  const { t, formatDateTime } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [permissionIds, setPermissionIds] = useState(null);

  const query = useQuery({ queryKey: queryKeys.role(id), queryFn: () => rolesApi.get(id).then((r) => r.data) });
  const permsQuery = useQuery({ queryKey: queryKeys.permissions, queryFn: () => permissionsApi.list().then((r) => r.data), staleTime: 5 * 60_000 });
  const role = query.data;
  const selected = permissionIds ?? (role?.permissions || []).map((p) => p.id);
  const superAdmin = role?.slug === 'super-admin';
  const canAssign = can(P.PERMISSIONS_ASSIGN) && !superAdmin;
  const dirty = Boolean(role && permissionIds && JSON.stringify([...permissionIds].sort()) !== JSON.stringify((role.permissions || []).map((p) => p.id).sort()));

  const savePerms = useApiMutation((ids) => rolesApi.replacePermissions(id, ids), {
    invalidate: [['roles'], ['role'], ['audit-logs']],
    successMessage: t('roles.permissionsSaved'),
    onSuccess: () => setPermissionIds(null),
  });
  const remove = useApiMutation(() => rolesApi.remove(id), {
    invalidate: [['roles'], ['audit-logs']],
    onSuccess: () => navigate('/roles'),
  });

  return (
    <div className="stack-lg">
      <PageHeader
        title={role ? roleLabel(t, role) : t('roles.title')}
        breadcrumbs={[{ label: t('roles.title'), to: '/roles' }, { label: role ? roleLabel(t, role) : t('common.details') }]}
        actions={
          <>
            {can(P.ROLES_UPDATE) && role && !role.isSystem && (
              <Button variant="gold-outline" icon={Pencil} to={`/roles/${id}/edit`}>
                {t('common.edit')}
              </Button>
            )}
            {can(P.ROLES_DELETE) && role && !role.isSystem && (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={role.usersCount > 0} title={role.usersCount > 0 ? t('roles.inUseHint') : undefined}>
                {t('common.delete')}
              </Button>
            )}
          </>
        }
      />
      <QueryState query={query}>
        {(data) => (
          <>
            {data.isSystem && <Alert tone="info">{data.slug === 'super-admin' ? t('roles.superAdminHint') : t('roles.protectedHint')}</Alert>}
            <Card>
              <CardHeader title={t('common.details')} />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: t('roles.name'), value: roleLabel(t, data) },
                    { label: t('roles.slug'), value: <span className="mono ltr">{data.slug}</span> },
                    { label: t('roles.type'), value: <Badge tone={data.isSystem ? 'gold' : 'info'}>{data.isSystem ? t('roles.systemRole') : t('roles.customRole')}</Badge> },
                    { label: t('roles.usersCount'), value: data.usersCount },
                    {
                      label: t('roles.permissionsCount'),
                      value:
                        data.slug === 'super-admin' || data.permissionsImplicit
                          ? data.permissionsCount
                            ? `${t('roles.allPermissions')} · ${data.permissionsCount}`
                            : t('roles.allPermissions')
                          : data.permissionsCount ?? data.permissions?.length ?? 0,
                    },
                    { label: t('roles.description'), value: data.description, full: true },
                    { label: t('common.details'), value: formatDateTime(data.createdAt) },
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('roles.permissions')} />
              <CardBody>
                {superAdmin ? (
                  <Alert tone="info">{t('roles.superAdminHint')}</Alert>
                ) : (
                  <PermissionEditor modules={permsQuery.data?.modules || []} value={selected} onChange={setPermissionIds} disabled={!canAssign} />
                )}
              </CardBody>
              {canAssign && dirty && (
                <CardFooter>
                  <Button variant="ghost" onClick={() => setPermissionIds(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="primary" icon={Save} loading={savePerms.isPending} onClick={() => savePerms.mutate(selected)}>
                    {t('roles.savePermissions')}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </>
        )}
      </QueryState>
      {confirmDelete && role && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDelete(false)}
          title={t('roles.deleteTitle')}
          body={t('roles.deleteBody', { name: roleLabel(t, role) })}
          loading={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      )}
    </div>
  );
}
