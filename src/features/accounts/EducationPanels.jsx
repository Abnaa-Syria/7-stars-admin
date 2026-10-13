import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { coursesApi, enrollmentsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { Badge, Card, DataTable, EmptyState } from '@/components/ui';

const COURSE_TONE = { DRAFT: 'muted', PUBLISHED: 'success', ARCHIVED: 'warning', SUSPENDED: 'danger' };
const ENROLL_TONE = { ACTIVE: 'success', COMPLETED: 'gold', BLOCKED: 'danger', CANCELLED: 'muted' };

export function TeacherCoursesPanel({ teacherId }) {
  const { t, formatDate } = useI18n();
  const query = useQuery({
    queryKey: queryKeys.courses({ teacherId, limit: 50 }),
    queryFn: () => coursesApi.list({ teacherId, limit: 50 }),
    enabled: Boolean(teacherId),
  });

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: t('education.course'),
        render: (r) => (
          <Link to={`/courses/${r.id}`} style={{ fontWeight: 700 }}>
            {r.title}
          </Link>
        ),
      },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={COURSE_TONE[r.status]}>{t(`enums.courseStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'students', header: t('education.students'), render: (r) => r.studentCount ?? 0 },
      { key: 'publishedAt', header: t('education.publishedAt'), render: (r) => (r.publishedAt ? formatDate(r.publishedAt) : '—') },
    ],
    [t, formatDate],
  );

  const rows = query.data?.data || [];
  const summary = rows.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      acc.enrolled += c.studentCount || 0;
      return acc;
    },
    { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0, SUSPENDED: 0, enrolled: 0 },
  );

  return (
    <div className="stack-md">
      <Card>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <Badge tone="muted">{t('enums.courseStatus.DRAFT')}: {summary.DRAFT}</Badge>
          <Badge tone="success">{t('enums.courseStatus.PUBLISHED')}: {summary.PUBLISHED}</Badge>
          <Badge tone="warning">{t('enums.courseStatus.ARCHIVED')}: {summary.ARCHIVED}</Badge>
          <Badge tone="danger">{t('enums.courseStatus.SUSPENDED')}: {summary.SUSPENDED}</Badge>
          <Badge tone="info">{t('education.students')}: {summary.enrolled}</Badge>
        </div>
      </Card>
      <Card>
        {!query.isLoading && rows.length === 0 ? <EmptyState title={t('education.emptyCourses')} /> : <DataTable columns={columns} rows={rows} query={query} />}
      </Card>
    </div>
  );
}

export function StudentEnrollmentsPanel({ studentId }) {
  const { t, formatDate, formatDateTime } = useI18n();
  const query = useQuery({
    queryKey: queryKeys.enrollments({ studentId, limit: 50 }),
    queryFn: () => enrollmentsApi.list({ studentId, limit: 50 }),
    enabled: Boolean(studentId),
  });

  const columns = useMemo(
    () => [
      {
        key: 'course',
        header: t('education.course'),
        render: (r) =>
          r.course?.id ? (
            <Link to={`/courses/${r.course.id}`} style={{ fontWeight: 700 }}>
              {r.course.title}
            </Link>
          ) : (
            '—'
          ),
      },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={ENROLL_TONE[r.status]}>{t(`enums.enrollmentStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'progress', header: t('education.progress'), render: (r) => `${r.progressPercent ?? 0}%` },
      { key: 'enrolledAt', header: t('education.enrolledAt'), render: (r) => formatDate(r.enrolledAt) },
      { key: 'completedAt', header: t('education.completedAt'), render: (r) => (r.completedAt ? formatDate(r.completedAt) : '—') },
      { key: 'lastAccessedAt', header: t('education.lastAccess'), render: (r) => (r.lastAccessedAt ? formatDateTime(r.lastAccessedAt) : '—') },
    ],
    [t, formatDate, formatDateTime],
  );

  const rows = query.data?.data || [];
  return (
    <Card>
      {!query.isLoading && rows.length === 0 ? <EmptyState title={t('education.emptyEnrollments')} /> : <DataTable columns={columns} rows={rows} query={query} />}
    </Card>
  );
}
