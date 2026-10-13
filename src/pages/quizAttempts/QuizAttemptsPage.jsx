import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { quizAttemptsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { AttemptDetailModal } from '@/components/attempts/AttemptDetailModal';
import { Card, DataTable, EnumBadge, FilterBar, PageHeader, Pagination, ViewButton } from '@/components/ui';

const ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'];

export default function QuizAttemptsPage() {
  const { t, formatDateTime } = useI18n();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.quizAttempts(list.params), queryFn: () => quizAttemptsApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);

  const columns = useMemo(
    () => [
      { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
      { key: 'quiz', header: t('phase3.quiz'), render: (r) => r.quiz?.title || '—' },
      { key: 'score', header: t('phase3.score'), render: (r) => (r.scorePercent != null ? `${r.scorePercent}%` : '—') },
      { key: 'status', header: t('education.status'), render: (r) => <EnumBadge value={r.status} ns="attemptStatus" /> },
      { key: 'submittedAt', header: t('phase3.submittedAt'), render: (r) => (r.submittedAt ? formatDateTime(r.submittedAt) : '—') },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => <ViewButton onClick={() => setDetailId(r.id)} />,
      },
    ],
    [t, formatDateTime],
  );

  return (
    <>
      <PageHeader title={t('phase3.attemptsTitle')} subtitle={t('phase3.attemptsSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            {
              key: 'status',
              label: t('education.status'),
              options: ATTEMPT_STATUSES.map((v) => ({ value: v, label: t(`enums.attemptStatus.${v}`, null, v) })),
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
      <AttemptDetailModal attemptId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
