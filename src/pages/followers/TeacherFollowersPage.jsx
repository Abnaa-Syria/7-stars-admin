import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { teacherFollowersApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Button, Card, ConfirmDialog, DataTable, PageHeader, Pagination } from '@/components/ui';

export default function TeacherFollowersPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.teacherFollowers(list.params), queryFn: () => teacherFollowersApi.list(list.params) });
  const [pending, setPending] = useState(null);
  const remove = useApiMutation((id) => teacherFollowersApi.remove(id), {
    invalidate: [['teacher-followers'], ['audit-logs']],
    onSuccess: () => setPending(null),
  });

  const columns = useMemo(
    () => [
      { key: 'teacher', header: t('education.teacher'), render: (r) => r.teacher?.fullName || '—' },
      { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
      { key: 'createdAt', header: t('education.followedAt'), render: (r) => formatDateTime(r.createdAt) },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) =>
          can(P.TEACHER_FOLLOWERS_DELETE) ? (
            <Button size="sm" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); setPending(r); }} aria-label={t('common.delete')} />
          ) : null,
      },
    ],
    [t, formatDateTime, can],
  );

  return (
    <>
      <PageHeader title={t('education.followersTitle')} subtitle={t('education.followersSubtitle')} />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} sort={list.params} onSortChange={list.setParams} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={t('education.removeFollow')}
        body={`${pending?.student?.fullName || ''} → ${pending?.teacher?.fullName || ''}`}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(pending.id)}
      />
    </>
  );
}
