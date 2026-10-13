import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { auditApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { Card, DataTable, DescriptionList, Drawer, FilterBar, Identity, PageHeader, Pagination } from '@/components/ui';
import {
  auditActionLabel,
  auditDataToItems,
  auditEntityLabel,
  formatUserAgent,
} from './auditLabels';

const ACTION_KEYS = [
  'USER_REGISTERED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ROLES_UPDATED',
  'USER_SUSPENDED',
  'USER_BLOCKED',
  'USER_REACTIVATED',
  'USER_DELETED',
  'USER_PASSWORD_RESET_BY_ADMIN',
  'EMAIL_VERIFIED',
  'PHONE_VERIFIED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'SESSION_REVOKED',
  'ALL_SESSIONS_REVOKED',
  'REFRESH_TOKEN_REUSE_DETECTED',
  'PROFILE_UPDATED',
  'TEACHER_PROFILE_UPDATED',
  'STUDENT_PROFILE_UPDATED',
  'TEACHER_VERIFIED',
  'TEACHER_VERIFICATION_REJECTED',
  'TEACHER_VERIFICATION_REVOKED',
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_DELETED',
  'ROLE_PERMISSIONS_UPDATED',
  'MEDIA_UPLOADED',
  'MEDIA_DELETED',
  'SETTINGS_UPDATED',
];

const ENTITY_KEYS = ['User', 'TeacherProfile', 'StudentProfile', 'AuthSession', 'Role', 'MediaFile', 'SystemSetting'];

function SnapshotSection({ title, data, t }) {
  const items = auditDataToItems(t, data).map((item) => ({
    ...item,
    value:
      typeof item.value === 'string' && item.value.includes('\n') ? (
        <span style={{ whiteSpace: 'pre-wrap' }}>{item.value}</span>
      ) : (
        item.value
      ),
  }));
  return (
    <div className="stack-sm">
      <h3 className="card__title">{title}</h3>
      {items.length === 0 ? (
        <p className="field__hint" style={{ margin: 0 }}>
          {t('audit.emptySnapshot')}
        </p>
      ) : (
        <Card>
          <DescriptionList items={items} />
        </Card>
      )}
    </div>
  );
}

function formatIp(t, ip) {
  if (!ip) return null;
  if (ip === '::1' || ip === '127.0.0.1') return t('audit.localhost');
  return ip;
}

export default function AuditLogsPage() {
  const { t, formatDateTime } = useI18n();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.auditLogs(list.params), queryFn: () => auditApi.list(list.params) });
  const [selectedId, setSelectedId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.auditLog(selectedId),
    queryFn: () => auditApi.get(selectedId).then((r) => r.data),
    enabled: Boolean(selectedId),
  });

  const columns = [
    { key: 'createdAt', header: t('audit.timestamp'), sortKey: 'createdAt', render: (e) => <span className="nowrap">{formatDateTime(e.createdAt)}</span> },
    { key: 'actor', header: t('audit.actor'), render: (e) => (e.actor ? <Identity user={e.actor} size={28} /> : <span className="subtle">{t('audit.system')}</span>) },
    { key: 'action', header: t('audit.action'), sortKey: 'action', render: (e) => auditActionLabel(t, e.action) },
    {
      key: 'entity',
      header: t('audit.entity'),
      render: (e) => auditEntityLabel(t, e.entityType),
    },
    { key: 'ip', header: t('audit.ip'), render: (e) => formatIp(t, e.ipAddress) || '—' },
  ];

  return (
    <div className="stack-lg">
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'action', label: t('audit.action'), options: ACTION_KEYS.map((a) => ({ value: a, label: auditActionLabel(t, a) })) },
            { key: 'entityType', label: t('audit.entityType'), options: ENTITY_KEYS.map((e) => ({ value: e, label: auditEntityLabel(t, e) })) },
            { key: 'actorUserId', label: t('audit.actorId'), type: 'text', ltr: true, placeholder: t('audit.actorId') },
            { key: 'entityId', label: t('audit.entityId'), type: 'text', ltr: true, placeholder: t('audit.entityId') },
            { key: 'ipAddress', label: t('audit.ip'), type: 'text', ltr: true, placeholder: t('audit.ip') },
            { key: 'createdFrom', label: t('common.from'), type: 'date' },
            { key: 'createdTo', label: t('common.to'), type: 'date' },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} sort={list.params} onSortChange={list.setParams} onRowClick={(e) => setSelectedId(e.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Drawer open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title={t('audit.details')}>
        {detail.isLoading && <p className="field__hint">{t('common.loading')}</p>}
        {detail.data && (
          <div className="stack-lg">
            <DescriptionList
              items={[
                { label: t('audit.timestamp'), value: formatDateTime(detail.data.createdAt) },
                { label: t('audit.actor'), value: detail.data.actor?.fullName || t('audit.system') },
                { label: t('audit.action'), value: auditActionLabel(t, detail.data.action) },
                { label: t('audit.entityType'), value: auditEntityLabel(t, detail.data.entityType) },
                { label: t('audit.ip'), value: formatIp(t, detail.data.ipAddress) },
                { label: t('audit.userAgent'), value: formatUserAgent(t, detail.data.userAgent), full: true },
              ].filter((item) => item.value != null && item.value !== '')}
            />
            <SnapshotSection title={t('audit.before')} data={detail.data.beforeData} t={t} />
            <SnapshotSection title={t('audit.after')} data={detail.data.afterData} t={t} />
            {(detail.data.metadata && Object.keys(detail.data.metadata).length > 0) && (
              <SnapshotSection title={t('audit.metadata')} data={detail.data.metadata} t={t} />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
