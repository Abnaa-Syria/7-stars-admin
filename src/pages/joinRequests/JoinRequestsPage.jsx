import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { joinRequestsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import {
  Button,
  Card,
  DataTable,
  DescriptionList,
  EnumBadge,
  FilterBar,
  Modal,
  PageHeader,
  Pagination,
  QueryState,
  ViewButton,
} from '@/components/ui';

export default function JoinRequestsPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.joinRequests(list.params), queryFn: () => joinRequestsApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.joinRequest(detailId),
    queryFn: () => joinRequestsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const invalidate = [['join-requests'], ['join-request', detailId], ['enrollments'], ['courses'], ['audit-logs']];
  const approve = useApiMutation((id) => joinRequestsApi.approve(id), {
    invalidate,
    onSuccess: () => setDetailId(null),
  });
  const decline = useApiMutation((id) => joinRequestsApi.decline(id), {
    invalidate,
    onSuccess: () => setDetailId(null),
  });

  const columns = useMemo(
    () => [
      { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
      { key: 'course', header: t('education.course'), render: (r) => r.course?.title || '—' },
      { key: 'teacher', header: t('education.teacher'), render: (r) => r.course?.teacher?.fullName || '—' },
      {
        key: 'status',
        header: t('education.status'),
        render: (r) => <EnumBadge value={r.status} ns="joinRequestStatus" />,
      },
      { key: 'requestedAt', header: t('education.requestedAt'), render: (r) => formatDateTime(r.requestedAt) },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {r.status === 'PENDING' && can(P.JOIN_REQUESTS_MANAGE) && (
              <>
                <Button size="sm" variant="primary" onClick={() => approve.mutate(r.id)}>
                  {t('education.actions.approve')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => decline.mutate(r.id)}>
                  {t('education.actions.decline')}
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [t, formatDateTime, can, approve, decline],
  );

  return (
    <>
      <PageHeader title={t('education.joinRequestsTitle')} subtitle={t('education.joinRequestsSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            {
              key: 'status',
              label: t('education.status'),
              options: ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'].map((v) => ({
                value: v,
                label: t(`enums.joinRequestStatus.${v}`, null, v),
              })),
            },
          ]}
        />
        <DataTable
          columns={columns}
          rows={query.data?.data}
          query={query}
          filtered={list.activeFilterCount > 0}
          sort={list.params}
          onSortChange={list.setParams}
          onRowClick={(r) => setDetailId(r.id)}
        />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase3.joinRequestDetail')}>
        <QueryState query={detail}>
          {(r) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('education.student'), value: r.student?.fullName || r.studentId },
                  { label: t('education.course'), value: r.course?.title || '—' },
                  { label: t('education.teacher'), value: r.course?.teacher?.fullName || '—' },
                  { label: t('education.status'), value: <EnumBadge value={r.status} ns="joinRequestStatus" /> },
                  { label: t('education.requestedAt'), value: r.requestedAt ? formatDateTime(r.requestedAt) : '—' },
                  {
                    label: t('phase3.respondedAt'),
                    value: r.respondedAt ? formatDateTime(r.respondedAt) : '—',
                  },
                  { label: t('phase3.rejectionReason'), value: r.rejectionReason || '—' },
                ]}
              />
              {r.status === 'PENDING' && can(P.JOIN_REQUESTS_MANAGE) && (
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="outline" loading={decline.isPending} onClick={() => decline.mutate(r.id)}>
                    {t('education.actions.decline')}
                  </Button>
                  <Button variant="primary" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>
                    {t('education.actions.approve')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>
    </>
  );
}
