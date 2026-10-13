import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { permissionsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { Card, CardBody, CardHeader, PageHeader, QueryState } from '@/components/ui';

export default function PermissionsPage() {
  const { t } = useI18n();
  const query = useQuery({ queryKey: queryKeys.permissions, queryFn: () => permissionsApi.list().then((r) => r.data), staleTime: 5 * 60_000 });

  return (
    <div className="stack-lg">
      <PageHeader title={t('permissions.title')} subtitle={t('permissions.subtitle')} />
      <QueryState query={query}>
        {(data) => (
          <div className="perm-groups">
            {(data.modules || []).map((group) => (
              <Card key={group.module}>
                <CardHeader title={t(`permissions.modules.${group.module}`, null, group.module)} subtitle={`${group.permissions.length}`} />
                <CardBody flush>
                  <div className="perm-group__list">
                    {group.permissions.map((p) => (
                      <div key={p.id} className="perm-item">
                        <span>
                          <div className="perm-group__title">{p.name}</div>
                          <div className="perm-item__slug ltr">{p.slug}</div>
                          {p.description && <div className="field__hint">{p.description}</div>}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
