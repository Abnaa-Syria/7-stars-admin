import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { coursesApi, enrollmentsApi, studentsApi } from '@/api/admin';
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
  FormField,
  Modal,
  PageHeader,
  Pagination,
  ProgressBar,
  QueryState,
  Select,
  ViewButton,
} from '@/components/ui';

const schema = z.object({
  courseId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export default function EnrollmentsPage() {
  const { t, formatDate, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.enrollments(list.params), queryFn: () => enrollmentsApi.list(list.params) });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { courseId: '', studentId: '' } });

  const detail = useQuery({
    queryKey: queryKeys.enrollment(detailId),
    queryFn: () => enrollmentsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const courses = useQuery({
    queryKey: queryKeys.courses({ limit: 100, sortBy: 'title' }),
    queryFn: () => coursesApi.list({ limit: 100, sortBy: 'title', sortOrder: 'asc' }),
    enabled: createOpen,
  });
  const students = useQuery({
    queryKey: queryKeys.students({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => studentsApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'createdAt' }),
    enabled: createOpen,
  });

  const invalidate = [['enrollments'], ['enrollment', detailId], ['courses'], ['audit-logs']];
  const create = useApiMutation((body) => enrollmentsApi.create(body), {
    invalidate,
    onSuccess: () => {
      setCreateOpen(false);
      form.reset();
    },
  });
  const block = useApiMutation((id) => enrollmentsApi.block(id), { invalidate });
  const reactivate = useApiMutation((id) => enrollmentsApi.reactivate(id), { invalidate });
  const cancel = useApiMutation((id) => enrollmentsApi.cancel(id), { invalidate });

  const courseOptions = (courses.data?.data || []).map((c) => ({ value: c.id, label: c.title }));
  const studentOptions = (students.data?.data || []).map((s) => ({
    value: s.id,
    label: `${s.fullName || s.email}${s.email ? ` (${s.email})` : ''}`,
  }));

  const columns = useMemo(
    () => [
      { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
      { key: 'course', header: t('education.course'), render: (r) => r.course?.title || '—' },
      {
        key: 'status',
        header: t('education.status'),
        render: (r) => <EnumBadge value={r.status} ns="enrollmentStatus" />,
      },
      {
        key: 'progress',
        header: t('education.progress'),
        render: (r) => <ProgressBar value={r.progressPercent ?? 0} />,
      },
      {
        key: 'source',
        header: t('education.source'),
        render: (r) => t(`enums.enrollmentSource.${r.source}`, null, r.source),
      },
      { key: 'enrolledAt', header: t('education.enrolledAt'), render: (r) => formatDate(r.enrolledAt) },
      {
        key: 'lastAccessedAt',
        header: t('education.lastAccess'),
        render: (r) => (r.lastAccessedAt ? formatDateTime(r.lastAccessedAt) : '—'),
      },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {can(P.ENROLLMENTS_UPDATE) && r.status === 'ACTIVE' && (
              <Button size="sm" variant="danger" onClick={() => block.mutate(r.id)}>
                {t('education.actions.block')}
              </Button>
            )}
            {can(P.ENROLLMENTS_UPDATE) && r.status === 'BLOCKED' && (
              <Button size="sm" variant="outline" onClick={() => reactivate.mutate(r.id)}>
                {t('education.actions.reactivate')}
              </Button>
            )}
            {can(P.ENROLLMENTS_CANCEL) && r.status !== 'CANCELLED' && (
              <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                {t('education.actions.cancel')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, formatDate, formatDateTime, can, block, reactivate, cancel],
  );

  return (
    <>
      <PageHeader
        title={t('education.enrollmentsTitle')}
        subtitle={t('education.enrollmentsSubtitle')}
        actions={
          can(P.ENROLLMENTS_CREATE) && (
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
              {t('education.manualEnroll')}
            </Button>
          )
        }
      />
      <Card>
        <FilterBar
          {...list}
          filters={[
            {
              key: 'status',
              label: t('education.status'),
              options: ['ACTIVE', 'COMPLETED', 'BLOCKED', 'CANCELLED'].map((v) => ({
                value: v,
                label: t(`enums.enrollmentStatus.${v}`, null, v),
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

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase3.enrollmentDetail')} size="lg">
        <QueryState query={detail}>
          {(e) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('education.student'), value: e.student?.fullName || e.studentId },
                  { label: t('users.email'), value: e.student?.email || '—' },
                  { label: t('education.course'), value: e.course?.title || '—' },
                  { label: t('education.status'), value: <EnumBadge value={e.status} ns="enrollmentStatus" /> },
                  {
                    label: t('education.progress'),
                    value: <ProgressBar value={e.progressPercent ?? 0} />,
                  },
                  {
                    label: t('education.source'),
                    value: t(`enums.enrollmentSource.${e.source}`, null, e.source),
                  },
                  { label: t('education.enrolledAt'), value: e.enrolledAt ? formatDateTime(e.enrolledAt) : '—' },
                  {
                    label: t('education.lastAccess'),
                    value: e.lastAccessedAt ? formatDateTime(e.lastAccessedAt) : '—',
                  },
                  {
                    label: t('education.completedAt'),
                    value: e.completedAt ? formatDateTime(e.completedAt) : '—',
                  },
                ]}
              />
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                {can(P.ENROLLMENTS_UPDATE) && e.status === 'ACTIVE' && (
                  <Button variant="danger" loading={block.isPending} onClick={() => block.mutate(e.id)}>
                    {t('education.actions.block')}
                  </Button>
                )}
                {can(P.ENROLLMENTS_UPDATE) && e.status === 'BLOCKED' && (
                  <Button variant="outline" loading={reactivate.isPending} onClick={() => reactivate.mutate(e.id)}>
                    {t('education.actions.reactivate')}
                  </Button>
                )}
                {can(P.ENROLLMENTS_CANCEL) && e.status !== 'CANCELLED' && (
                  <Button variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(e.id)}>
                    {t('education.actions.cancel')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </QueryState>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('education.manualEnroll')} locked={create.isPending}>
        <form className="stack-md" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <FormField label={t('education.course')} error={form.formState.errors.courseId?.message}>
            <Select {...form.register('courseId')} placeholder={t('education.selectCourse')} options={courseOptions} />
          </FormField>
          <FormField label={t('education.student')} error={form.formState.errors.studentId?.message}>
            <Select {...form.register('studentId')} placeholder={t('education.selectStudent')} options={studentOptions} />
          </FormField>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
