import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { coursesApi, quizzesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Button, Card, DataTable, EnumBadge, FilterBar, FormField, Modal, PageHeader, Pagination, Select, TextInput, ViewButton, BilingualField, bilingualPayload } from '@/components/ui';

const schema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid(),
  titleAr: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().max(200).optional().or(z.literal('')),
  descriptionAr: z.string().max(5000).optional().or(z.literal('')),
  descriptionEn: z.string().max(5000).optional().or(z.literal('')),
  passingScorePercent: z.union([z.literal(''), z.coerce.number().int().min(0).max(100)]).optional(),
  maxAttempts: z.union([z.literal(''), z.coerce.number().int().min(1).max(100)]).optional(),
});

export default function QuizzesListPage() {
  const { t, formatDate } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.quizzes(list.params), queryFn: () => quizzesApi.list(list.params) });
  const [createOpen, setCreateOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { courseId: '', moduleId: '', titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '', passingScorePercent: 60, maxAttempts: 1 },
  });
  const courseId = form.watch('courseId');

  const courses = useQuery({
    queryKey: queryKeys.courses({ limit: 100, sortBy: 'title' }),
    queryFn: () => coursesApi.list({ limit: 100, sortBy: 'title', sortOrder: 'asc' }),
    enabled: createOpen,
  });
  const courseDetail = useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => coursesApi.get(courseId).then((r) => r.data),
    enabled: createOpen && Boolean(courseId),
  });

  const create = useApiMutation(
    (values) =>
      quizzesApi.create({
        courseId: values.courseId,
        moduleId: values.moduleId,
        ...bilingualPayload(values, ['title', 'description']),
        passingScorePercent: values.passingScorePercent === '' ? 60 : Number(values.passingScorePercent),
        maxAttempts: values.maxAttempts === '' ? 1 : Number(values.maxAttempts),
      }),
    {
      invalidate: [['quizzes'], ['audit-logs']],
      onSuccess: (result) => {
        setCreateOpen(false);
        form.reset();
        if (result?.data?.id) navigate(`/quizzes/${result.data.id}?tab=questions`);
      },
    },
  );

  const courseOptions = (courses.data?.data || []).map((c) => ({ value: c.id, label: c.title }));
  const moduleOptions = (courseDetail.data?.modules || []).map((m) => ({
    value: m.id,
    label: `${m.position}. ${m.title}`,
  }));

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: t('phase3.quiz'),
        render: (r) => (
          <div>
            <div className="cell-title">{r.title}</div>
            <div className="field__hint">{r.course?.title}</div>
          </div>
        ),
      },
      { key: 'teacher', header: t('education.teacher'), render: (r) => r.teacher?.fullName || r.course?.teacher?.fullName || '—' },
      { key: 'status', header: t('education.status'), render: (r) => <EnumBadge value={r.status} ns="quizStatus" /> },
      { key: 'questions', header: t('phase3.questions'), render: (r) => r.questionCount ?? 0 },
      { key: 'attempts', header: t('phase3.attempts'), render: (r) => r.attemptCount ?? 0 },
      { key: 'updatedAt', header: t('education.updatedAt'), render: (r) => formatDate(r.updatedAt) },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => <ViewButton to={`/quizzes/${r.id}`} />,
      },
    ],
    [t, formatDate],
  );

  return (
    <>
      <PageHeader
        title={t('phase3.quizzesTitle')}
        subtitle={t('phase3.quizzesSubtitle')}
        actions={
          can(P.QUIZZES_CREATE) && (
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
              {t('phase3.createQuiz')}
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
              options: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SUSPENDED'].map((v) => ({
                value: v,
                label: t(`enums.quizStatus.${v}`, null, v),
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
          onRowClick={(r) => navigate(`/quizzes/${r.id}`)}
        />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('phase3.createQuiz')} locked={create.isPending}>
        <form className="stack-md" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <FormField label={t('education.course')} required error={form.formState.errors.courseId?.message}>
            <Select
              {...form.register('courseId', {
                onChange: () => form.setValue('moduleId', ''),
              })}
              placeholder={t('education.selectCourse')}
              options={courseOptions}
            />
          </FormField>
          <FormField label={t('phase3.module')} required error={form.formState.errors.moduleId?.message}>
            <Select {...form.register('moduleId')} placeholder={t('phase3.selectModule')} options={moduleOptions} disabled={!courseId} />
          </FormField>
          <BilingualField form={form} name="title" label={t('phase3.title')} required />
          <BilingualField form={form} name="description" label={t('education.description')} multiline rows={2} />
          <div className="row" style={{ gap: 12 }}>
            <FormField className="grow" label={t('phase3.passScore')}>
              <TextInput type="number" min={0} max={100} {...form.register('passingScorePercent')} />
            </FormField>
            <FormField className="grow" label={t('phase3.maxAttempts')}>
              <TextInput type="number" min={1} {...form.register('maxAttempts')} />
            </FormField>
          </div>
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
