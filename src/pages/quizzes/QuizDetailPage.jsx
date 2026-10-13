import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { quizzesApi, quizAttemptsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { useListParams } from '@/hooks/useListParams';
import { P } from '@/utils/permissions';
import { AttemptDetailModal } from '@/components/attempts/AttemptDetailModal';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  EnumBadge,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  QueryState,
  Select,
  StatCard,
  Tabs,
  TextInput,
  Textarea,
  ViewButton,
} from '@/components/ui';
const QUESTION_TYPES = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'TEXT'];
const TYPE_TONE = { MCQ: 'info', TRUE_FALSE: 'gold', MULTIPLE_SELECT: 'warning', TEXT: 'muted' };

function buildReorderItems(list, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= list.length) return null;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map((row, i) => ({ id: row.id, position: i + 1 }));
}

const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().trim().min(1).max(10000),
  explanation: z.string().max(10000).optional().or(z.literal('')),
  assessmentPoints: z.coerce.number().int().min(1).max(1000),
  isRequired: z.boolean().optional(),
  options: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(2000),
        isCorrect: z.boolean().optional(),
      }),
    )
    .optional(),
  acceptedAnswersText: z.string().optional().or(z.literal('')),
});

export default function QuizDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [questionModal, setQuestionModal] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [attemptDetailId, setAttemptDetailId] = useState(null);

  const query = useQuery({
    queryKey: queryKeys.quiz(id),
    queryFn: () => quizzesApi.get(id).then((r) => r.data),
    enabled: Boolean(id),
  });
  const attemptsList = useListParams({ quizId: id });
  const attempts = useQuery({
    queryKey: queryKeys.quizAttempts({ ...attemptsList.params, quizId: id }),
    queryFn: () => quizAttemptsApi.list({ ...attemptsList.params, quizId: id }),
    enabled: tab === 'attempts',
  });
  const performance = useQuery({
    queryKey: ['quiz-performance', id],
    queryFn: () => quizzesApi.performance(id).then((r) => r.data),
    enabled: tab === 'performance',
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: 'MCQ',
      prompt: '',
      explanation: '',
      assessmentPoints: 1,
      isRequired: true,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
      acceptedAnswersText: '',
    },
  });
  const optionsArray = useFieldArray({ control: questionForm.control, name: 'options' });
  const questionType = questionForm.watch('type');

  useEffect(() => {
    if (!questionModal || questionModal.id) return;
    if (questionType === 'TRUE_FALSE') {
      questionForm.setValue('options', [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]);
    }
  }, [questionType, questionModal, questionForm]);

  useEffect(() => {
    if (!questionModal) return;
    if (questionModal.id) {
      questionForm.reset({
        type: questionModal.type || 'MCQ',
        prompt: questionModal.prompt || '',
        explanation: questionModal.explanation || '',
        assessmentPoints: questionModal.assessmentPoints || 1,
        isRequired: questionModal.isRequired !== false,
        options:
          questionModal.options?.length > 0
            ? questionModal.options.map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) }))
            : [
                { text: '', isCorrect: true },
                { text: '', isCorrect: false },
              ],
        acceptedAnswersText: (questionModal.acceptedAnswers || []).map((a) => a.answer || a).join('\n'),
      });
    } else {
      questionForm.reset({
        type: 'MCQ',
        prompt: '',
        explanation: '',
        assessmentPoints: 1,
        isRequired: true,
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
        acceptedAnswersText: '',
      });
    }
  }, [questionModal, questionForm]);

  const invalidate = [['quizzes'], ['quiz', id], ['quiz-attempts'], ['audit-logs'], ['courses']];
  const suspend = useApiMutation(() => quizzesApi.suspend(id), { invalidate });
  const unsuspend = useApiMutation(() => quizzesApi.unsuspend(id), { invalidate });
  const publish = useApiMutation(() => quizzesApi.publish(id), { invalidate, onSuccess: () => setConfirm(null) });
  const archive = useApiMutation(() => quizzesApi.archive(id), { invalidate, onSuccess: () => setConfirm(null) });
  const restore = useApiMutation(() => quizzesApi.restore(id), { invalidate, onSuccess: () => setConfirm(null) });
  const removeQuiz = useApiMutation(() => quizzesApi.remove(id), {
    invalidate: [['quizzes'], ['audit-logs']],
    onSuccess: () => {
      setConfirm(null);
      navigate('/quizzes');
    },
  });

  const saveQuestion = useApiMutation(
    (values) => {
      const body = {
        type: values.type,
        prompt: values.prompt.trim(),
        explanation: values.explanation?.trim() || null,
        assessmentPoints: Number(values.assessmentPoints),
        isRequired: values.isRequired !== false,
      };
      if (values.type === 'TEXT') {
        body.acceptedAnswers = (values.acceptedAnswersText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        body.textGradingMode = 'CASE_INSENSITIVE';
      } else {
        body.options = (values.options || [])
          .filter((o) => o.text?.trim())
          .map((o, i) => ({ text: o.text.trim(), isCorrect: Boolean(o.isCorrect), position: i + 1 }));
      }
      return questionModal?.id ? quizzesApi.updateQuestion(questionModal.id, body) : quizzesApi.createQuestion(id, body);
    },
    {
      invalidate,
      onSuccess: () => setQuestionModal(null),
      onError: (error) => applyServerErrors(error, questionForm.setError),
    },
  );

  const deleteQuestion = useApiMutation(() => quizzesApi.removeQuestion(pendingDelete.id), {
    invalidate,
    onSuccess: () => setPendingDelete(null),
  });

  const reorderQuestions = useApiMutation((items) => quizzesApi.reorderQuestions(id, items), { invalidate });

  const tabs = [
    { id: 'overview', label: t('education.tabs.overview') },
    { id: 'questions', label: t('phase3.questions') },
    { id: 'attempts', label: t('phase3.attempts') },
    { id: 'performance', label: t('phase3.performance') },
  ];

  const data = query.data;

  return (
    <div className="stack-lg">
      <PageHeader
        title={data?.title || t('phase3.quizzesTitle')}
        breadcrumbs={[
          { label: t('phase3.quizzesTitle'), to: '/quizzes' },
          ...(data?.courseId ? [{ label: data.course?.title || t('education.course'), to: `/courses/${data.courseId}?tab=quizzes` }] : []),
          { label: data?.title || t('common.details') },
        ]}
        actions={
          data && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {can(P.QUIZZES_PUBLISH) && data.status === 'DRAFT' && (
                <Button size="sm" variant="primary" onClick={() => setConfirm({ action: 'publish', title: t('phase3.publishQuiz') })}>
                  {t('education.actions.publish')}
                </Button>
              )}
              {can(P.QUIZZES_PUBLISH) && data.status === 'PUBLISHED' && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'archive', title: t('education.actions.archive') })}>
                  {t('education.actions.archive')}
                </Button>
              )}
              {can(P.QUIZZES_PUBLISH) && data.status === 'ARCHIVED' && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'restore', title: t('education.actions.restore') })}>
                  {t('education.actions.restore')}
                </Button>
              )}
              {can(P.QUIZZES_SUSPEND) &&
                (data.status === 'SUSPENDED' ? (
                  <Button size="sm" variant="outline" onClick={() => unsuspend.mutate()} loading={unsuspend.isPending}>
                    {t('education.actions.unsuspend')}
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => suspend.mutate()} loading={suspend.isPending}>
                    {t('education.actions.suspend')}
                  </Button>
                ))}
              {can(P.QUIZZES_DELETE) && data.status === 'DRAFT' && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setConfirm({ action: 'delete', title: t('phase3.deleteQuiz'), tone: 'danger' })}
                >
                  {t('education.actions.delete')}
                </Button>
              )}
            </div>
          )
        }
      />
      <QueryState query={query}>
        {(quiz) => (
          <>
            <EnumBadge value={quiz.status} ns="quizStatus" />
            <Tabs tabs={tabs} active={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />
            {tab === 'overview' && (
              <Card>
                <DescriptionList
                  items={[
                    {
                      label: t('education.course'),
                      value: quiz.courseId ? <Link to={`/courses/${quiz.courseId}`}>{quiz.course?.title}</Link> : quiz.course?.title,
                    },
                    { label: t('phase3.module'), value: quiz.module?.title },
                    { label: t('phase3.passScore'), value: `${quiz.passingScorePercent}%` },
                    { label: t('phase3.maxAttempts'), value: quiz.maxAttempts },
                    { label: t('phase3.timeLimit'), value: quiz.timeLimitSeconds ? `${quiz.timeLimitSeconds}s` : '—' },
                    { label: t('phase3.assessmentPoints'), value: quiz.totalAssessmentPoints },
                    { label: t('phase3.required'), value: quiz.isRequired ? t('common.yes') : t('common.no') },
                    { label: t('phase3.questions'), value: quiz.questionCount ?? quiz.questions?.length ?? 0 },
                  ]}
                />
              </Card>
            )}
            {tab === 'questions' && (
              <div className="stack-md">
                <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="field__hint" style={{ margin: 0 }}>
                    {(quiz.questions || []).length} {t('phase3.questions')}
                  </div>
                  {can(P.QUIZ_QUESTIONS_CREATE) && (
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => setQuestionModal({ id: null })}>
                      {t('phase3.addQuestion')}
                    </Button>
                  )}
                </div>

                {(quiz.questions || []).length === 0 ? (
                  <EmptyState title={t('phase3.emptyQuestions')} body={t('phase3.emptyQuestionsHint')} />
                ) : (
                  (quiz.questions || []).map((q, index) => {
                    const questions = quiz.questions || [];
                    return (
                      <Card key={q.id}>
                        <CardBody>
                          <div className="quiz-q">
                            <div className="quiz-q__index" aria-hidden>
                              {q.position || index + 1}
                            </div>

                            <div className="quiz-q__main">
                              <div className="quiz-q__meta">
                                <Badge tone={TYPE_TONE[q.type] || 'muted'}>
                                  {t(`enums.questionType.${q.type}`, null, q.type)}
                                </Badge>
                                <Badge tone="gold">{t('phase3.pointsShort', { n: q.assessmentPoints ?? 0 })}</Badge>
                                {q.isRequired !== false && <Badge tone="info">{t('phase3.required')}</Badge>}
                              </div>

                              <p className="quiz-q__prompt">{q.prompt}</p>

                              {(q.options || []).length > 0 && (
                                <ul className="quiz-q__options">
                                  {q.options.map((o) => (
                                    <li
                                      key={o.id}
                                      className={`quiz-q__option${o.isCorrect ? ' quiz-q__option--correct' : ''}`}
                                    >
                                      <span className="quiz-q__option-mark" aria-label={o.isCorrect ? t('phase3.correctOption') : undefined}>
                                        {o.isCorrect ? <Check size={14} strokeWidth={3} /> : null}
                                      </span>
                                      <span className="quiz-q__option-text">{o.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {(q.acceptedAnswers || []).length > 0 && (
                                <div className="quiz-q__answers">
                                  <span className="quiz-q__answers-label">{t('phase3.acceptedAnswers')}</span>
                                  {(q.acceptedAnswers || []).map((a, i) => (
                                    <span key={a.id || `${q.id}-a-${i}`} className="quiz-q__chip">
                                      {a.answer || a}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="quiz-q__actions">
                              {can(P.QUIZ_QUESTIONS_UPDATE) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={ArrowUp}
                                    disabled={index === 0 || reorderQuestions.isPending}
                                    onClick={() => {
                                      const items = buildReorderItems(questions, index, index - 1);
                                      if (items) reorderQuestions.mutate(items);
                                    }}
                                    aria-label={t('education.moveUp')}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={ArrowDown}
                                    disabled={index === questions.length - 1 || reorderQuestions.isPending}
                                    onClick={() => {
                                      const items = buildReorderItems(questions, index, index + 1);
                                      if (items) reorderQuestions.mutate(items);
                                    }}
                                    aria-label={t('education.moveDown')}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Pencil}
                                    onClick={() => setQuestionModal(q)}
                                    aria-label={t('common.edit')}
                                  />
                                </>
                              )}
                              {can(P.QUIZ_QUESTIONS_DELETE) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={Trash2}
                                  onClick={() => setPendingDelete(q)}
                                  aria-label={t('common.delete')}
                                />
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
            {tab === 'attempts' && (
              <Card>
                <DataTable
                  columns={[
                    { key: 'student', header: t('education.student'), render: (r) => r.student?.fullName || '—' },
                    { key: 'n', header: '#', render: (r) => r.attemptNumber },
                    {
                      key: 'score',
                      header: t('phase3.score'),
                      render: (r) => (r.scorePercent != null ? `${r.scorePercent}%` : '—'),
                    },
                    {
                      key: 'status',
                      header: t('education.status'),
                      render: (r) => <EnumBadge value={r.status} ns="attemptStatus" />,
                    },
                    {
                      key: 'passed',
                      header: t('phase3.passed'),
                      render: (r) =>
                        r.passed == null ? '—' : (
                          <Badge tone={r.passed ? 'success' : 'danger'}>
                            {r.passed ? t('common.yes') : t('common.no')}
                          </Badge>
                        ),
                    },
                    {
                      key: 'submittedAt',
                      header: t('phase3.submittedAt'),
                      render: (r) => (r.submittedAt ? formatDateTime(r.submittedAt) : '—'),
                    },
                    {
                      key: 'actions',
                      header: '',
                      className: 'actions-cell',
                      render: (r) => <ViewButton onClick={() => setAttemptDetailId(r.id)} />,
                    },
                  ]}
                  rows={attempts.data?.data}
                  query={attempts}
                  onRowClick={(r) => setAttemptDetailId(r.id)}
                />
                <Pagination meta={attempts.data?.meta} onChange={attemptsList.setParams} />
              </Card>
            )}
            {tab === 'performance' && (
              <QueryState query={performance}>
                {(p) => (
                  <div className="stat-grid">
                    <StatCard label={t('phase3.participants')} value={p.uniqueParticipants ?? 0} tone="info" />
                    <StatCard label={t('phase3.attempts')} value={p.totalAttempts ?? 0} />
                    <StatCard label={t('phase3.passRate')} value={`${p.passRate ?? 0}%`} tone="success" />
                    <StatCard label={t('phase3.averageScore')} value={p.averageScore ?? '—'} tone="gold" />
                    <StatCard label={t('phase3.highestScore')} value={p.highestScore ?? '—'} tone="success" />
                    <StatCard label={t('phase3.lowestScore')} value={p.lowestScore ?? '—'} tone="warning" />
                  </div>
                )}
              </QueryState>
            )}
          </>
        )}
      </QueryState>

      <Modal
        open={Boolean(questionModal)}
        onClose={() => setQuestionModal(null)}
        title={questionModal?.id ? t('phase3.editQuestion') : t('phase3.addQuestion')}
        size="lg"
        locked={saveQuestion.isPending}
      >
        <form className="stack-md" onSubmit={questionForm.handleSubmit((v) => saveQuestion.mutate(v))}>
          <FormField label={t('phase3.questionType')}>
            <Select
              {...questionForm.register('type')}
              options={QUESTION_TYPES.map((v) => ({
                value: v,
                label: t(`enums.questionType.${v}`, null, v),
              }))}
            />
          </FormField>
          <FormField label={t('phase3.questionPrompt')} required error={questionForm.formState.errors.prompt?.message}>
            <Textarea rows={3} {...questionForm.register('prompt')} />
          </FormField>
          <div className="row" style={{ gap: 12 }}>
            <FormField className="grow" label={t('phase3.assessmentPoints')}>
              <TextInput type="number" min={1} {...questionForm.register('assessmentPoints')} />
            </FormField>
            <div style={{ paddingTop: 28 }}>
              <Checkbox label={t('phase3.required')} {...questionForm.register('isRequired')} />
            </div>
          </div>
          <FormField label={t('phase3.explanation')}>
            <Textarea rows={2} {...questionForm.register('explanation')} />
          </FormField>

          {questionType === 'TEXT' ? (
            <FormField label={t('phase3.acceptedAnswers')} hint="One answer per line">
              <Textarea rows={4} {...questionForm.register('acceptedAnswersText')} />
            </FormField>
          ) : (
            <div className="stack-sm">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{t('phase3.options')}</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => optionsArray.append({ text: '', isCorrect: false })}
                >
                  {t('phase3.addOption')}
                </Button>
              </div>
              {optionsArray.fields.map((field, index) => (
                <div key={field.id} className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <FormField className="grow" label={`${t('phase3.optionText')} ${index + 1}`}>
                    <TextInput {...questionForm.register(`options.${index}.text`)} />
                  </FormField>
                  <Checkbox label={t('phase3.isCorrect')} {...questionForm.register(`options.${index}.isCorrect`)} />
                  <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => optionsArray.remove(index)} />
                </div>
              ))}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setQuestionModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saveQuestion.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t('phase3.deleteQuestion')}
        body={pendingDelete?.prompt}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={deleteQuestion.isPending}
        onConfirm={() => deleteQuestion.mutate()}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        body={data?.title}
        confirmLabel={confirm?.action === 'delete' ? t('common.delete') : t('common.confirm')}
        tone={confirm?.tone || 'primary'}
        loading={publish.isPending || archive.isPending || restore.isPending || removeQuiz.isPending}
        onConfirm={() => {
          if (confirm?.action === 'publish') publish.mutate();
          else if (confirm?.action === 'archive') archive.mutate();
          else if (confirm?.action === 'restore') restore.mutate();
          else if (confirm?.action === 'delete') removeQuiz.mutate();
        }}
      />

      <AttemptDetailModal attemptId={attemptDetailId} onClose={() => setAttemptDetailId(null)} />
    </div>
  );
}
