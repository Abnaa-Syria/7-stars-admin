import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { quizAttemptsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Badge, Button, DescriptionList, EnumBadge, FormField, Modal, QueryState, SwitchRow, TextInput } from '@/components/ui';

function formatAnswer(q) {
  const a = q.answer;
  if (!a) return '—';
  if (a.textAnswer) return a.textAnswer;
  if (Array.isArray(a.selectedOptionIds) && a.selectedOptionIds.length) {
    const labels = (q.options || [])
      .filter((o) => a.selectedOptionIds.includes(o.id))
      .map((o) => o.text);
    return labels.length ? labels.join(' · ') : a.selectedOptionIds.join(', ');
  }
  return '—';
}

function ManualGradeForm({ attemptId, question, onGraded }) {
  const { t } = useI18n();
  const [points, setPoints] = useState(question.answer?.assessmentPointsAwarded ?? '');
  const [isCorrect, setIsCorrect] = useState(question.answer?.isCorrect ?? true);
  const grade = useApiMutation(
    (body) => quizAttemptsApi.gradeAnswer(attemptId, question.answer.id, body),
    {
      invalidate: [['quiz-attempts'], ['quiz-attempt', attemptId]],
      successMessage: t('phase3.gradeSaved'),
      onSuccess: () => onGraded?.(),
    },
  );

  return (
    <div className="stack-sm" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
      <div className="field__hint cell-title">{t('phase3.manualGrade')}</div>
      <FormField label={t('phase3.pointsAwarded')}>
        <TextInput
          type="number"
          className="ltr"
          min={0}
          max={question.assessmentPoints}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          disabled={grade.isPending}
        />
      </FormField>
      <SwitchRow
        label={t('phase3.markCorrect')}
        checked={Boolean(isCorrect)}
        onChange={setIsCorrect}
        disabled={grade.isPending}
      />
      <Button
        size="sm"
        variant="primary"
        loading={grade.isPending}
        disabled={points === '' || Number.isNaN(Number(points))}
        onClick={() =>
          grade.mutate({
            pointsAwarded: Number(points),
            isCorrect: Boolean(isCorrect),
          })
        }
      >
        {t('phase3.submitGrade')}
      </Button>
    </div>
  );
}

/** Shared attempt detail modal used by attempts list and quiz detail. */
export function AttemptDetailModal({ attemptId, onClose }) {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canGrade = can(P.QUIZ_ATTEMPTS_GRADE);
  const detail = useQuery({
    queryKey: queryKeys.quizAttempt(attemptId),
    queryFn: () => quizAttemptsApi.get(attemptId).then((r) => r.data),
    enabled: Boolean(attemptId),
  });

  return (
    <Modal open={Boolean(attemptId)} onClose={onClose} title={t('phase3.attemptDetail')} size="lg">
      <QueryState query={detail}>
        {(a) => (
          <div className="stack-md">
            <DescriptionList
              items={[
                { label: t('education.student'), value: a.student?.fullName || a.studentId },
                { label: t('phase3.quiz'), value: a.quiz?.title || '—' },
                { label: t('phase3.attemptNumber'), value: a.attemptNumber },
                { label: t('education.status'), value: <EnumBadge value={a.status} ns="attemptStatus" /> },
                {
                  label: t('phase3.score'),
                  value: a.scorePercent != null ? `${a.scorePercent}%` : '—',
                },
                {
                  label: t('phase3.passed'),
                  value: a.passed == null ? '—' : a.passed ? t('common.yes') : t('common.no'),
                },
                { label: t('phase3.correctCount'), value: a.correctCount ?? '—' },
                { label: t('phase3.incorrectCount'), value: a.incorrectCount ?? '—' },
                { label: t('phase3.unansweredCount'), value: a.unansweredCount ?? '—' },
                {
                  label: t('phase3.pointsEarned'),
                  value:
                    a.assessmentPointsEarned != null
                      ? `${a.assessmentPointsEarned} / ${a.assessmentPointsPossible ?? '—'}`
                      : '—',
                },
                { label: t('phase3.startedAt'), value: a.startedAt ? formatDateTime(a.startedAt) : '—' },
                { label: t('phase3.submittedAt'), value: a.submittedAt ? formatDateTime(a.submittedAt) : '—' },
                { label: t('phase3.durationSeconds'), value: a.durationSeconds ?? '—' },
              ]}
            />
            {Array.isArray(a.questions) && a.questions.length > 0 && (
              <div className="stack-sm">
                <h4 className="card__title" style={{ fontSize: 14 }}>{t('phase3.questions')}</h4>
                {a.questions.map((q, i) => (
                  <div key={q.id} className="card" style={{ padding: '14px 16px' }}>
                    <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <span className="cell-title">
                        {i + 1}. {q.prompt}
                      </span>
                      <div className="row" style={{ gap: 6 }}>
                        {q.answer?.needsManualGrading && <Badge tone="warning">{t('phase3.needsGrading')}</Badge>}
                        <EnumBadge value={q.type} ns="questionType" dot={false} />
                      </div>
                    </div>
                    <div className="field__hint" style={{ marginBottom: 6 }}>
                      {t('phase3.studentAnswer')}: <strong>{formatAnswer(q)}</strong>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {q.answer?.isCorrect != null && (
                        <Badge tone={q.answer.isCorrect ? 'success' : 'danger'}>
                          {q.answer.isCorrect ? t('common.yes') : t('common.no')}
                        </Badge>
                      )}
                      <span className="field__hint">
                        {q.answer?.assessmentPointsAwarded ?? 0} / {q.assessmentPoints} {t('phase3.assessmentPoints')}
                      </span>
                    </div>
                    {canGrade && q.answer?.needsManualGrading && q.answer?.id && (
                      <ManualGradeForm
                        attemptId={attemptId}
                        question={q}
                        onGraded={() => {
                          queryClient.invalidateQueries({ queryKey: queryKeys.quizAttempt(attemptId) });
                          queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </QueryState>
    </Modal>
  );
}
