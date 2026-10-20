import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { coursesApi, enrollmentsApi, joinRequestsApi, quizzesApi, studentsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useListParams } from '@/hooks/useListParams';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  EnumBadge,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  ProgressBar,
  QueryState,
  Select,
  StatCard,
  Tabs,
  TextInput,
  ViewButton,
} from '@/components/ui';
import CourseFormModal from './CourseFormModal';
import CurriculumManager from './CurriculumManager';

const STATUS_TONE = { DRAFT: 'muted', PUBLISHED: 'success', ARCHIVED: 'warning', SUSPENDED: 'danger' };
const ENROLL_TONE = { ACTIVE: 'success', COMPLETED: 'gold', BLOCKED: 'danger', CANCELLED: 'muted' };
const JOIN_TONE = { PENDING: 'warning', APPROVED: 'success', DECLINED: 'danger', CANCELLED: 'muted' };

const enrollSchema = z.object({ studentId: z.string().uuid() });
const quizSchema = z.object({
  title: z.string().trim().min(2).max(200),
  moduleId: z.string().uuid(),
  passingScorePercent: z.union([z.literal(''), z.coerce.number().int().min(0).max(100)]).optional(),
  maxAttempts: z.union([z.literal(''), z.coerce.number().int().min(1).max(100)]).optional(),
});

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatDate, formatDateTime } = useI18n();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [progressStudentId, setProgressStudentId] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const enrollForm = useForm({ resolver: zodResolver(enrollSchema), defaultValues: { studentId: '' } });
  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: '', moduleId: '', passingScorePercent: 60, maxAttempts: 1 },
  });

  const query = useQuery({
    queryKey: queryKeys.course(id),
    queryFn: () => coursesApi.get(id).then((r) => r.data),
    enabled: Boolean(id),
  });

  const enrollList = useListParams({ courseId: id });
  const enrollments = useQuery({
    queryKey: queryKeys.enrollments({ ...enrollList.params, courseId: id }),
    queryFn: () => enrollmentsApi.list({ ...enrollList.params, courseId: id }),
    enabled: tab === 'students' || tab === 'activity',
  });

  const joinList = useListParams({ courseId: id });
  const joins = useQuery({
    queryKey: queryKeys.joinRequests({ ...joinList.params, courseId: id }),
    queryFn: () => joinRequestsApi.list({ ...joinList.params, courseId: id }),
    enabled: tab === 'join-requests',
  });

  const quizzes = useQuery({
    queryKey: queryKeys.quizzes({ courseId: id, limit: 100 }),
    queryFn: () => quizzesApi.list({ courseId: id, limit: 100, sortBy: 'updatedAt' }),
    enabled: tab === 'quizzes' || quizOpen,
  });

  const performance = useQuery({
    queryKey: ['course-performance', id],
    queryFn: () => coursesApi.performance(id).then((r) => r.data),
    enabled: tab === 'reports' && can(P.ANALYTICS_READ),
  });

  const reportStudents = useQuery({
    queryKey: ['course-reports-students', id],
    queryFn: () => coursesApi.reportsStudents(id).then((r) => r.data),
    enabled: tab === 'reports' && can(P.REPORTS_READ),
  });

  const leaderboard = useQuery({
    queryKey: ['course-leaderboard', id],
    queryFn: () => coursesApi.leaderboard(id).then((r) => r.data),
    enabled: tab === 'reports' && can(P.LEADERBOARDS_READ),
  });

  const studentProgress = useQuery({
    queryKey: ['course-student-progress', id, progressStudentId],
    queryFn: () => coursesApi.studentProgress(id, progressStudentId).then((r) => r.data),
    enabled: Boolean(progressStudentId) && can(P.PROGRESS_READ),
  });

  const students = useQuery({
    queryKey: queryKeys.students({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => studentsApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'createdAt' }),
    enabled: enrollOpen,
  });

  const invalidate = [['courses'], ['course', id], ['enrollments'], ['join-requests'], ['quizzes'], ['audit-logs']];
  const suspend = useApiMutation(() => coursesApi.suspend(id), { invalidate, onSuccess: () => setConfirm(null) });
  const unsuspend = useApiMutation(() => coursesApi.unsuspend(id), { invalidate, onSuccess: () => setConfirm(null) });
  const archive = useApiMutation(() => coursesApi.archive(id), { invalidate, onSuccess: () => setConfirm(null) });
  const restore = useApiMutation(() => coursesApi.restore(id), { invalidate, onSuccess: () => setConfirm(null) });
  const publish = useApiMutation(() => coursesApi.publish(id), { invalidate, onSuccess: () => setConfirm(null) });
  const remove = useApiMutation(() => coursesApi.remove(id), {
    invalidate: [['courses'], ['audit-logs']],
    onSuccess: () => {
      setConfirm(null);
      navigate('/courses');
    },
  });
  const regenerateCode = useApiMutation(() => coursesApi.regenerateCode(id), { invalidate });
  const revokeCode = useApiMutation(() => coursesApi.revokeCode(id), { invalidate });
  const blockEnrollment = useApiMutation((enrollmentId) => enrollmentsApi.block(enrollmentId), { invalidate });
  const reactivateEnrollment = useApiMutation((enrollmentId) => enrollmentsApi.reactivate(enrollmentId), { invalidate });
  const approveJoin = useApiMutation((requestId) => joinRequestsApi.approve(requestId), { invalidate });
  const declineJoin = useApiMutation((requestId) => joinRequestsApi.decline(requestId), { invalidate });
  const createEnrollment = useApiMutation((body) => enrollmentsApi.create({ ...body, courseId: id }), {
    invalidate,
    onSuccess: () => {
      setEnrollOpen(false);
      enrollForm.reset();
    },
  });
  const createQuiz = useApiMutation(
    (values) =>
      quizzesApi.create({
        courseId: id,
        moduleId: values.moduleId,
        title: values.title.trim(),
        passingScorePercent: values.passingScorePercent === '' ? 60 : Number(values.passingScorePercent),
        maxAttempts: values.maxAttempts === '' ? 1 : Number(values.maxAttempts),
      }),
    {
      invalidate,
      onSuccess: (result) => {
        setQuizOpen(false);
        quizForm.reset();
        if (result?.data?.id) navigate(`/quizzes/${result.data.id}?tab=questions`);
      },
    },
  );

  const tabs = useMemo(
    () =>
      [
        { id: 'overview', label: t('education.tabs.overview') },
        { id: 'curriculum', label: t('education.tabs.curriculum') },
        { id: 'quizzes', label: t('education.tabs.quizzes') },
        { id: 'students', label: t('education.tabs.students') },
        { id: 'join-requests', label: t('education.tabs.joinRequests') },
        { id: 'activity', label: t('education.tabs.activity') },
        (can(P.ANALYTICS_READ) || can(P.REPORTS_READ) || can(P.LEADERBOARDS_READ)) && {
          id: 'reports',
          label: t('education.tabs.reports'),
        },
      ].filter(Boolean),
    [t, can],
  );

  const course = query.data;
  const confirmLoading =
    suspend.isPending || unsuspend.isPending || archive.isPending || restore.isPending || publish.isPending || remove.isPending;

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') suspend.mutate();
    else if (confirm.action === 'unsuspend') unsuspend.mutate();
    else if (confirm.action === 'archive') archive.mutate();
    else if (confirm.action === 'restore') restore.mutate();
    else if (confirm.action === 'publish') publish.mutate();
    else if (confirm.action === 'delete') remove.mutate();
    else if (confirm.action === 'revokeCode') revokeCode.mutate(undefined, { onSuccess: () => setConfirm(null) });
  };

  const copyCode = async (code) => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const studentOptions = (students.data?.data || []).map((s) => ({
    value: s.id,
    label: `${s.fullName || s.email}${s.email ? ` (${s.email})` : ''}`,
  }));
  const moduleOptions = (course?.modules || []).map((m) => ({
    value: m.id,
    label: `${m.position}. ${m.title}`,
  }));

  const activityRows = useMemo(() => {
    const rows = enrollments.data?.data || [];
    return [...rows].sort((a, b) => {
      const ta = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const tb = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return tb - ta;
    });
  }, [enrollments.data?.data]);

  return (
    <div className="stack-lg">
      <PageHeader
        title={course?.title || t('education.coursesTitle')}
        breadcrumbs={[{ label: t('education.coursesTitle'), to: '/courses' }, { label: course?.title || t('common.details') }]}
        actions={
          course && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {can(P.COURSES_UPDATE) && (
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
                  {t('education.actions.edit')}
                </Button>
              )}
              {can(P.COURSES_PUBLISH) && course.status === 'DRAFT' && (
                <Button size="sm" variant="primary" onClick={() => setConfirm({ action: 'publish', title: t('education.publishCourse'), body: t('education.publishConfirm') })}>
                  {t('education.actions.publish')}
                </Button>
              )}
              {can(P.COURSES_SUSPEND) && course.status !== 'SUSPENDED' && (
                <Button size="sm" variant="danger" onClick={() => setConfirm({ action: 'suspend', title: t('education.actions.suspend'), body: course.title })}>
                  {t('education.actions.suspend')}
                </Button>
              )}
              {can(P.COURSES_SUSPEND) && course.status === 'SUSPENDED' && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'unsuspend', title: t('education.actions.unsuspend'), body: course.title })}>
                  {t('education.actions.unsuspend')}
                </Button>
              )}
              {can(P.COURSES_PUBLISH) && course.status === 'PUBLISHED' && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'archive', title: t('education.actions.archive'), body: course.title })}>
                  {t('education.actions.archive')}
                </Button>
              )}
              {can(P.COURSES_PUBLISH) && course.status === 'ARCHIVED' && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'restore', title: t('education.actions.restore'), body: course.title })}>
                  {t('education.actions.restore')}
                </Button>
              )}
              {can(P.COURSES_DELETE) && course.status === 'DRAFT' && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setConfirm({ action: 'delete', title: t('education.deleteCourse'), body: t('education.deleteCourseConfirm'), tone: 'danger' })}
                >
                  {t('education.actions.delete')}
                </Button>
              )}
            </div>
          )
        }
      />

      <QueryState query={query}>
        {(data) => (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={STATUS_TONE[data.status]}>{t(`enums.courseStatus.${data.status}`, null, data.status)}</Badge>
              <Badge>{t(`enums.courseVisibility.${data.visibility}`, null, data.visibility)}</Badge>
              <Badge tone="info">{t(`enums.courseLevel.${data.level}`, null, data.level)}</Badge>
            </div>

            <Tabs tabs={tabs} active={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />

            {tab === 'overview' && (
              <div className="stack-md">
                {data.cover?.url && (
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <img src={data.cover.url} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
                  </Card>
                )}

                <Card>
                  <div className="stack-md">
                    <div style={{ fontWeight: 700 }}>{t('education.code')}</div>
                    <p className="field__hint" style={{ margin: 0 }}>
                      {t('education.codeHint')}
                    </p>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <code className="ltr" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
                        {data.activeCode?.code || t('education.noActiveCode')}
                      </code>
                      {data.activeCode?.code && (
                        <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyCode(data.activeCode.code)}>
                          {codeCopied ? t('education.codeCopied') : t('education.copyCode')}
                        </Button>
                      )}
                      {can(P.COURSES_UPDATE) && (
                        <>
                          <Button size="sm" variant="outline" loading={regenerateCode.isPending} onClick={() => regenerateCode.mutate()}>
                            {t('education.regenerateCode')}
                          </Button>
                          {data.activeCode?.code && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                setConfirm({
                                  action: 'revokeCode',
                                  title: t('education.revokeCode'),
                                  body: data.activeCode.code,
                                  tone: 'danger',
                                })
                              }
                            >
                              {t('education.revokeCode')}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>

                <Card>
                  <DescriptionList
                    items={[
                      {
                        label: t('education.teacher'),
                        value: data.teacher?.id ? (
                          <Link to={`/teachers/${data.teacher.id}`}>{data.teacher.fullName}</Link>
                        ) : (
                          data.teacher?.fullName || '—'
                        ),
                      },
                      { label: t('education.category'), value: data.category?.name },
                      { label: t('education.level'), value: t(`enums.courseLevel.${data.level}`, null, data.level) },
                      { label: t('education.status'), value: t(`enums.courseStatus.${data.status}`, null, data.status) },
                      { label: t('education.visibility'), value: t(`enums.courseVisibility.${data.visibility}`, null, data.visibility) },
                      { label: t('education.enrollmentMode'), value: t(`enums.enrollmentMode.${data.enrollmentMode}`, null, data.enrollmentMode) },
                      { label: t('education.accessMode'), value: t(`enums.contentAccessMode.${data.contentAccessMode}`, null, data.contentAccessMode) },
                      { label: t('education.students'), value: data.studentCount ?? 0 },
                      { label: t('education.modules'), value: data.moduleCount ?? 0 },
                      { label: t('education.lessons'), value: data.lessonCount ?? 0 },
                      { label: t('education.durationMinutes'), value: data.estimatedDurationMinutes ?? '—' },
                      { label: t('education.maxStudents'), value: data.maxStudents ?? '—' },
                      { label: t('education.publishedAt'), value: data.publishedAt ? formatDateTime(data.publishedAt) : '—' },
                      { label: t('education.updatedAt'), value: formatDateTime(data.updatedAt) },
                      { label: t('education.shortDescription'), value: data.shortDescription || '—' },
                      { label: t('education.fullDescription'), value: data.fullDescription || '—' },
                    ]}
                  />
                </Card>
                {data.publishValidation && !data.publishValidation.canPublish && (data.publishValidation.issues || []).length > 0 && (
                  <Card>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('education.publishBlocked')}</div>
                    <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                      {(data.publishValidation.issues || []).map((issue) => (
                        <li key={issue.code || issue.message}>{issue.message || issue.code}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {tab === 'curriculum' && <CurriculumManager courseId={id} modules={data.modules || []} />}

            {tab === 'quizzes' && (
              <div className="stack-md">
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {can(P.QUIZZES_CREATE) && (
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => setQuizOpen(true)}>
                      {t('phase3.createQuiz')}
                    </Button>
                  )}
                </div>
                <Card>
                  {(quizzes.data?.data || []).length === 0 && !quizzes.isLoading ? (
                    <EmptyState title={t('phase3.emptyQuizzes')} />
                  ) : (
                    <DataTable
                      columns={[
                        { key: 'title', header: t('phase3.quiz'), render: (r) => r.title },
                        { key: 'module', header: t('phase3.module'), render: (r) => r.module?.title || '—' },
                        {
                          key: 'status',
                          header: t('education.status'),
                          render: (r) => <EnumBadge value={r.status} ns="quizStatus" />,
                        },
                        { key: 'questions', header: t('phase3.questions'), render: (r) => r.questionCount ?? 0 },
                        { key: 'attempts', header: t('phase3.attempts'), render: (r) => r.attemptCount ?? 0 },
                        {
                          key: 'actions',
                          header: '',
                          className: 'actions-cell',
                          render: (r) => <ViewButton to={`/quizzes/${r.id}`} />,
                        },
                      ]}
                      rows={quizzes.data?.data}
                      query={quizzes}
                      onRowClick={(r) => navigate(`/quizzes/${r.id}`)}
                    />
                  )}
                </Card>
              </div>
            )}

            {tab === 'students' && (
              <div className="stack-md">
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {can(P.ENROLLMENTS_CREATE) && (
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => setEnrollOpen(true)}>
                      {t('education.manualEnroll')}
                    </Button>
                  )}
                </div>
                <Card>
                  <DataTable
                    columns={[
                      { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
                      {
                        key: 'status',
                        header: t('education.status'),
                        render: (r) => (
                          <Badge tone={ENROLL_TONE[r.status]}>{t(`enums.enrollmentStatus.${r.status}`, null, r.status)}</Badge>
                        ),
                      },
                      { key: 'progress', header: t('education.progress'), render: (r) => <ProgressBar value={r.progressPercent ?? 0} /> },
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
                          <div className="row" onClick={(e) => e.stopPropagation()}>
                            {can(P.PROGRESS_READ) && r.studentId && (
                              <Button size="sm" variant="ghost" onClick={() => setProgressStudentId(r.studentId)}>
                                {t('education.viewProgress')}
                              </Button>
                            )}
                            {can(P.ENROLLMENTS_UPDATE) && r.status === 'ACTIVE' && (
                              <Button size="sm" variant="danger" onClick={() => blockEnrollment.mutate(r.id)}>
                                {t('education.actions.block')}
                              </Button>
                            )}
                            {can(P.ENROLLMENTS_UPDATE) && r.status === 'BLOCKED' && (
                              <Button size="sm" variant="outline" onClick={() => reactivateEnrollment.mutate(r.id)}>
                                {t('education.actions.reactivate')}
                              </Button>
                            )}
                          </div>
                        ),
                      },
                    ]}
                    rows={enrollments.data?.data}
                    query={enrollments}
                  />
                  <Pagination meta={enrollments.data?.meta} onChange={enrollList.setParams} />
                </Card>
              </div>
            )}

            {tab === 'join-requests' && (
              <Card>
                <DataTable
                  columns={[
                    { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
                    {
                      key: 'status',
                      header: t('education.status'),
                      render: (r) => (
                        <Badge tone={JOIN_TONE[r.status]}>{t(`enums.joinRequestStatus.${r.status}`, null, r.status)}</Badge>
                      ),
                    },
                    { key: 'requestedAt', header: t('education.requestedAt'), render: (r) => formatDateTime(r.requestedAt) },
                    {
                      key: 'actions',
                      header: '',
                      className: 'actions-cell',
                      render: (r) =>
                        r.status === 'PENDING' && can(P.JOIN_REQUESTS_MANAGE) ? (
                          <div className="row" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="primary" onClick={() => approveJoin.mutate(r.id)}>
                              {t('education.actions.approve')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => declineJoin.mutate(r.id)}>
                              {t('education.actions.decline')}
                            </Button>
                          </div>
                        ) : null,
                    },
                  ]}
                  rows={joins.data?.data}
                  query={joins}
                />
                <Pagination meta={joins.data?.meta} onChange={joinList.setParams} />
              </Card>
            )}

            {tab === 'activity' && (
              <Card>
                <DataTable
                  columns={[
                    { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
                    { key: 'progress', header: t('education.progress'), render: (r) => `${r.progressPercent ?? 0}%` },
                    {
                      key: 'status',
                      header: t('education.status'),
                      render: (r) => (
                        <Badge tone={ENROLL_TONE[r.status]}>{t(`enums.enrollmentStatus.${r.status}`, null, r.status)}</Badge>
                      ),
                    },
                    {
                      key: 'lastAccessedAt',
                      header: t('education.lastAccess'),
                      render: (r) => (r.lastAccessedAt ? formatDateTime(r.lastAccessedAt) : '—'),
                    },
                    {
                      key: 'completedAt',
                      header: t('education.completedAt'),
                      render: (r) => (r.completedAt ? formatDateTime(r.completedAt) : '—'),
                    },
                    {
                      key: 'actions',
                      header: '',
                      className: 'actions-cell',
                      render: (r) =>
                        can(P.PROGRESS_READ) && r.studentId ? (
                          <Button size="sm" variant="ghost" onClick={() => setProgressStudentId(r.studentId)}>
                            {t('education.viewProgress')}
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={activityRows}
                  query={enrollments}
                />
                <Pagination meta={enrollments.data?.meta} onChange={enrollList.setParams} />
              </Card>
            )}

            {tab === 'reports' && (
              <div className="stack-md">
                {can(P.ANALYTICS_READ) && (
                  <QueryState query={performance}>
                    {(p) => (
                      <div className="stat-grid">
                        <StatCard label={t('phase3.participants')} value={p.participants ?? 0} tone="info" />
                        <StatCard label={t('education.activeStudents')} value={p.activeStudents ?? 0} tone="success" />
                        <StatCard label={t('education.completedStudents')} value={p.completedStudents ?? 0} />
                        <StatCard
                          label={t('education.completionRate')}
                          value={`${p.courseCompletionRate ?? 0}%`}
                          hint={<ProgressBar value={p.courseCompletionRate ?? 0} showValue={false} />}
                          tone="gold"
                        />
                        <StatCard label={t('education.averageScore')} value={p.averageQuizScore ?? '—'} />
                        {p.quizCompletionRate != null && (
                          <StatCard
                            label={t('education.quizCompletionRate')}
                            value={`${p.quizCompletionRate}%`}
                            hint={<ProgressBar value={p.quizCompletionRate} showValue={false} />}
                            tone="info"
                          />
                        )}
                      </div>
                    )}
                  </QueryState>
                )}

                {can(P.LEADERBOARDS_READ) && (
                  <Card>
                    <div className="card__header" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <h3 className="card__title">{t('education.leaderboard')}</h3>
                    </div>
                    <DataTable
                      columns={[
                        {
                          key: 'rank',
                          header: t('education.rank'),
                          render: (r, i) => <Badge tone="gold">{r.rank ?? r.currentRank ?? i + 1}</Badge>,
                        },
                        { key: 'name', header: t('education.student'), render: (r) => r.displayName || '—' },
                        { key: 'points', header: t('education.points'), render: (r) => r.points ?? 0 },
                        { key: 'avg', header: t('education.averageScore'), render: (r) => r.averageQuizScore ?? '—' },
                        { key: 'passed', header: t('phase3.passed'), render: (r) => r.quizzesPassed ?? 0 },
                      ]}
                      rows={Array.isArray(leaderboard.data) ? leaderboard.data : leaderboard.data?.data || []}
                      query={leaderboard}
                      rowKey="studentId"
                    />
                  </Card>
                )}

                {can(P.REPORTS_READ) && (
                  <Card>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('education.students')}</div>
                    <DataTable
                      columns={[
                        { key: 'name', header: t('education.student'), render: (r) => r.fullName || '—' },
                        { key: 'points', header: t('education.points'), render: (r) => r.points ?? 0 },
                        { key: 'avg', header: t('education.averageScore'), render: (r) => r.averageQuizScore ?? '—' },
                        { key: 'lessons', header: t('education.completedLessons'), render: (r) => r.lessonsCompleted ?? 0 },
                        {
                          key: 'rank',
                          header: t('education.rank'),
                          render: (r) => (r.currentRank != null ? <Badge tone="gold">{r.currentRank}</Badge> : '—'),
                        },
                        {
                          key: 'actions',
                          header: '',
                          className: 'actions-cell',
                          render: (r) =>
                            can(P.PROGRESS_READ) ? (
                              <Button size="sm" variant="ghost" onClick={() => setProgressStudentId(r.studentId)}>
                                {t('education.viewProgress')}
                              </Button>
                            ) : null,
                        },
                      ]}
                      rows={Array.isArray(reportStudents.data) ? reportStudents.data : []}
                      query={reportStudents}
                      rowKey="studentId"
                    />
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </QueryState>

      <CourseFormModal open={editOpen} course={course} onClose={() => setEditOpen(false)} />

      <Modal open={enrollOpen} onClose={() => setEnrollOpen(false)} title={t('education.manualEnroll')} locked={createEnrollment.isPending}>
        <form className="stack-md" onSubmit={enrollForm.handleSubmit((v) => createEnrollment.mutate(v))}>
          <FormField label={t('education.student')} required error={enrollForm.formState.errors.studentId?.message}>
            <Select {...enrollForm.register('studentId')} placeholder={t('education.selectStudent')} options={studentOptions} />
          </FormField>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setEnrollOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={createEnrollment.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={quizOpen} onClose={() => setQuizOpen(false)} title={t('phase3.createQuiz')} locked={createQuiz.isPending}>
        <form className="stack-md" onSubmit={quizForm.handleSubmit((v) => createQuiz.mutate(v))}>
          <FormField label={t('phase3.title')} required error={quizForm.formState.errors.title?.message}>
            <TextInput {...quizForm.register('title')} />
          </FormField>
          <FormField label={t('phase3.module')} required error={quizForm.formState.errors.moduleId?.message}>
            <Select {...quizForm.register('moduleId')} placeholder={t('phase3.selectModule')} options={moduleOptions} />
          </FormField>
          <div className="row" style={{ gap: 12 }}>
            <FormField className="grow" label={t('phase3.passScore')}>
              <TextInput type="number" min={0} max={100} {...quizForm.register('passingScorePercent')} />
            </FormField>
            <FormField className="grow" label={t('phase3.maxAttempts')}>
              <TextInput type="number" min={1} {...quizForm.register('maxAttempts')} />
            </FormField>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setQuizOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={createQuiz.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(progressStudentId)}
        onClose={() => setProgressStudentId(null)}
        title={t('education.studentProgress')}
        size="lg"
      >
        <QueryState query={studentProgress}>
          {(detail) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('education.student'), value: detail.student?.fullName },
                  {
                    label: t('education.progress'),
                    value: <ProgressBar value={detail.progress?.progressPercent ?? 0} />,
                  },
                  {
                    label: t('education.completedLessons'),
                    value: `${detail.progress?.completedLessons ?? 0} / ${detail.progress?.totalLessons ?? 0}`,
                  },
                  {
                    label: t('education.status'),
                    value: detail.enrollment?.status
                      ? <EnumBadge value={detail.enrollment.status} ns="enrollmentStatus" />
                      : '—',
                  },
                ]}
              />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('education.moduleProgress')}</div>
                <DataTable
                  columns={[
                    { key: 'title', header: t('education.moduleTitle'), render: (r) => r.title || r.moduleTitle || '—' },
                    {
                      key: 'progress',
                      header: t('education.progress'),
                      render: (r) => <ProgressBar value={r.progressPercent ?? r.percent ?? 0} />,
                    },
                    {
                      key: 'status',
                      header: t('education.status'),
                      render: (r) => (r.status ? <EnumBadge value={r.status} ns="progressStatus" /> : '—'),
                    },
                  ]}
                  rows={detail.progress?.moduleProgress || []}
                  rowKey="moduleId"
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('education.recentActivity')}</div>
                <DataTable
                  columns={[
                    { key: 'lesson', header: t('education.lessonTitle'), render: (r) => r.lesson?.title || '—' },
                    {
                      key: 'status',
                      header: t('education.status'),
                      render: (r) => (r.status ? <EnumBadge value={r.status} ns="progressStatus" /> : '—'),
                    },
                    {
                      key: 'last',
                      header: t('education.lastAccess'),
                      render: (r) => (r.lastAccessedAt ? formatDateTime(r.lastAccessedAt) : '—'),
                    },
                  ]}
                  rows={detail.recentLessonActivity || []}
                />
              </div>
            </div>
          )}
        </QueryState>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.action === 'delete' ? t('common.delete') : t('common.confirm')}
        tone={confirm?.tone || (confirm?.action === 'suspend' || confirm?.action === 'delete' || confirm?.action === 'revokeCode' ? 'danger' : 'primary')}
        loading={confirmLoading || revokeCode.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
