import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { featureFlagsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Badge, Button, Card, DataTable, PageHeader } from '@/components/ui';

function flagTitle(t, key) {
  return t(['phase4', 'flags', key, 'title'], null, key);
}

function flagDescription(t, key, fallback) {
  return t(['phase4', 'flags', key, 'description'], null, fallback || '—');
}

export default function FeatureFlagsPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: () => featureFlagsApi.list().then((r) => r.data),
  });
  const update = useApiMutation(
    ({ id, enabled }) => featureFlagsApi.update(id, { enabled }),
    { invalidate: [['feature-flags']] },
  );

  const columns = useMemo(
    () => [
      {
        key: 'feature',
        header: t('phase4.flagKey'),
        render: (r) => (
          <div>
            <div style={{ fontWeight: 700 }}>{flagTitle(t, r.key)}</div>
            <div className="field__hint" style={{ marginTop: 4 }}>
              {flagDescription(t, r.key, r.description)}
            </div>
          </div>
        ),
      },
      {
        key: 'enabled',
        header: t('education.status'),
        render: (r) => (
          <Badge tone={r.enabled ? 'success' : 'muted'}>
            {r.enabled ? t('common.enabled') : t('common.disabled')}
          </Badge>
        ),
      },
      {
        key: 'updatedAt',
        header: t('education.updatedAt'),
        render: (r) => formatDateTime(r.updatedAt),
      },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) =>
          can(P.FEATURE_FLAGS_UPDATE) && (
            <Button
              size="sm"
              variant={r.enabled ? 'outline' : 'primary'}
              loading={update.isPending}
              onClick={() => update.mutate({ id: r.id, enabled: !r.enabled })}
            >
              {r.enabled ? t('phase4.flagDisable') : t('phase4.flagEnable')}
            </Button>
          ),
      },
    ],
    [t, formatDateTime, can, update],
  );

  return (
    <>
      <PageHeader title={t('phase4.featureFlagsTitle')} subtitle={t('phase4.featureFlagsSubtitle')} />
      <Card>
        <DataTable columns={columns} rows={query.data} query={query} />
      </Card>
    </>
  );
}
