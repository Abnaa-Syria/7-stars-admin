import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { rolesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { P } from '@/utils/permissions';
import { roleLabel } from '@/features/accounts/config';
import { Badge, Button, Card, DataTable, FilterBar, PageHeader, Pagination } from '@/components/ui';

export default function RolesListPage() {
  const { t, formatDate } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.roles(list.params), queryFn: () => rolesApi.list(list.params) });

  const columns = [
    {
      key: 'name',
      header: t('roles.name'),
      sortKey: 'name',
      render: (r) => (
        <div>
          <div className="cell-title">{roleLabel(t, r)}</div>
          <div className="field__hint ltr">{r.slug}</div>
        </div>
      ),
    },
    { key: 'type', header: t('roles.type'), render: (r) => <Badge tone={r.isSystem ? 'gold' : 'info'}>{r.isSystem ? t('roles.systemRole') : t('roles.customRole')}</Badge> },
    { key: 'usersCount', header: t('roles.usersCount'), render: (r) => r.usersCount ?? 0 },
    { key: 'permissionsCount', header: t('roles.permissionsCount'), render: (r) => r.permissionsCount ?? 0 },
    { key: 'createdAt', header: t('users.joined'), sortKey: 'createdAt', render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'actions-cell',
      render: (r) => (
        <div className="row" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Eye} to={`/roles/${r.id}`} aria-label={t('common.view')} />
          {can(P.ROLES_UPDATE) && !r.isSystem && <Button size="sm" variant="ghost" icon={Pencil} to={`/roles/${r.id}/edit`} aria-label={t('common.edit')} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        actions={
          can(P.ROLES_CREATE) && (
            <Button variant="primary" icon={Plus} to="/roles/create">
              {t('roles.create')}
            </Button>
          )
        }
      />
      <Card>
        <FilterBar
          {...list}
          filters={[{ key: 'isSystem', label: t('roles.type'), options: [{ value: 'true', label: t('roles.systemRole') }, { value: 'false', label: t('roles.customRole') }] }]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} sort={list.params} onSortChange={list.setParams} onRowClick={(r) => navigate(`/roles/${r.id}`)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
    </>
  );
}
