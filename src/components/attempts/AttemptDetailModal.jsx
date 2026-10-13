import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { quizAttemptsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { Badge, DescriptionList, EnumBadge, Modal, QueryState } from '@/components/ui';

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

/** Shared attempt detail modal used by attempts list and quiz detail. */
export function AttemptDetailModal({ attemptId, onClose }) {
  const { t, formatDateTime } = useI18n();
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
                      <span style={{ fontWeight: 700 }}>
                        {i + 1}. {q.prompt}
                      </span>
                      <EnumBadge value={q.type} ns="questionType" dot={false} />
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
