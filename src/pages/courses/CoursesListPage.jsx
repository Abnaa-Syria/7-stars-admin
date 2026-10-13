import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, coursesApi, teachersApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Badge, Button, Card, ConfirmDialog, DataTable, FilterBar, PageHeader, Pagination } from '@/components/ui';
import CourseFormModal from './CourseFormModal';

const STATUS_TONE = { DRAFT: 'muted', PUBLISHED: 'success', ARCHIVED: 'warning', SUSPENDED: 'danger' };

export default function CoursesListPage() {
  const { t, formatDate } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const list = useListParams({ sortBy: 'createdAt' });
  const query = useQuery({ queryKey: queryKeys.courses(list.params), queryFn: () => coursesApi.list(list.params) });
  const teachers = useQuery({
    queryKey: queryKeys.teachers({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => teachersApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'createdAt' }),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => categoriesApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'sortOrder', sortOrder: 'asc' }),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const remove = useApiMutation((id) => coursesApi.remove(id), {
    invalidate: [['courses'], ['audit-logs']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: t('education.course'),
        sortKey: 'title',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 700 }}>{r.title}</div>
            <div className="field__hint ltr">{r.slug}</div>
          </div>
        ),
      },
      {
        key: 'teacher',
        header: t('education.teacher'),
        render: (r) =>
          r.teacher?.id ? (
            <Button size="sm" variant="ghost" to={`/teachers/${r.teacher.id}`}>
              {r.teacher.fullName || '—'}
            </Button>
          ) : (
            '—'
          ),
      },
      { key: 'category', header: t('education.category'), render: (r) => r.category?.name || '—' },
      { key: 'level', header: t('education.level'), render: (r) => t(`enums.courseLevel.${r.level}`, null, r.level) },
      {
        key: 'status',
        header: t('education.status'),
        render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`enums.courseStatus.${r.status}`, null, r.status)}</Badge>,
      },
      { key: 'visibility', header: t('education.visibility'), render: (r) => t(`enums.courseVisibility.${r.visibility}`, null, r.visibility) },
      { key: 'students', header: t('education.students'), render: (r) => r.studentCount ?? 0 },
      { key: 'modules', header: t('education.modules'), render: (r) => r.moduleCount ?? 0 },
      { key: 'lessons', header: t('education.lessons'), render: (r) => r.lessonCount ?? 0 },
      { key: 'publishedAt', header: t('education.publishedAt'), sortKey: 'publishedAt', render: (r) => (r.publishedAt ? formatDate(r.publishedAt) : '—') },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" icon={Eye} to={`/courses/${r.id}`} aria-label={t('common.view')} />
            {can(P.COURSES_UPDATE) && (
              <Button
                size="sm"
                variant="ghost"
                icon={Pencil}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
                aria-label={t('common.edit')}
              />
            )}
            {can(P.COURSES_DELETE) && r.status === 'DRAFT' && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setPendingDelete(r)} aria-label={t('common.delete')} />
            )}
          </div>
        ),
      },
    ],
    [t, formatDate, can],
  );

  return (
    <>
      <PageHeader
        title={t('education.coursesTitle')}
        subtitle={t('education.coursesSubtitle')}
        actions={
          can(P.COURSES_CREATE) && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('education.createCourse')}
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
              options: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SUSPENDED'].map((v) => ({ value: v, label: t(`enums.courseStatus.${v}`, null, v) })),
            },
            {
              key: 'level',
              label: t('education.level'),
              options: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((v) => ({ value: v, label: t(`enums.courseLevel.${v}`, null, v) })),
            },
            {
              key: 'visibility',
              label: t('education.visibility'),
              options: ['PRIVATE', 'UNLISTED', 'PUBLIC'].map((v) => ({ value: v, label: t(`enums.courseVisibility.${v}`, null, v) })),
            },
            {
              key: 'teacherId',
              label: t('education.teacher'),
              options: (teachers.data?.data || []).map((u) => ({ value: u.id, label: u.fullName || u.email || u.id })),
            },
            {
              key: 'categoryId',
              label: t('education.category'),
              options: (categories.data?.data || []).map((c) => ({ value: c.id, label: c.name || c.nameAr || c.slug })),
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
          onRowClick={(r) => navigate(`/courses/${r.id}`)}
        />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <CourseFormModal
        open={formOpen}
        course={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t('education.deleteCourse')}
        body={`${pendingDelete?.title || ''}\n${t('education.deleteCourseConfirm')}`}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
