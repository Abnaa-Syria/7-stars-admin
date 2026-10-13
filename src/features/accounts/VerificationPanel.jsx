import { useState } from 'react';
import { BadgeCheck, Ban, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { teachersApi } from '@/api/admin';
import { ACCOUNT_QUERY_PREFIXES } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, DescriptionList, VerificationBadge } from '@/components/ui';

const TRANSITIONS = {
  verify: { from: ['UNVERIFIED', 'PENDING', 'REJECTED'], icon: BadgeCheck, reason: true, required: false },
  reject: { from: ['UNVERIFIED', 'PENDING'], icon: Ban, reason: true, required: true, danger: true },
  revoke: { from: ['VERIFIED'], icon: RotateCcw, reason: true, required: false, danger: true },
};

export function VerificationPanel({ account }) {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const profile = account.teacherProfile;
  const [action, setAction] = useState(null);

  const mutation = useApiMutation(
    ({ type, note }) => {
      const body = note ? { note } : {};
      if (type === 'verify') return teachersApi.verify(account.id, body);
      if (type === 'reject') return teachersApi.reject(account.id, { note });
      return teachersApi.revoke(account.id, body);
    },
    { invalidate: ACCOUNT_QUERY_PREFIXES, onSuccess: () => setAction(null) },
  );

  if (!profile) return null;
  const status = profile.verificationStatus;
  const copy = action && {
    verify: { title: t('teachers.confirm.verifyTitle'), body: t('teachers.confirm.verifyBody', { name: account.fullName }) },
    reject: { title: t('teachers.confirm.rejectTitle'), body: t('teachers.confirm.rejectBody', { name: account.fullName }) },
    revoke: { title: t('teachers.confirm.revokeTitle'), body: t('teachers.confirm.revokeBody', { name: account.fullName }) },
  }[action];

  return (
    <Card>
      <CardHeader
        title={t('users.tabs.verification')}
        actions={
          can(P.TEACHERS_VERIFY) &&
          account.status !== 'DELETED' &&
          Object.entries(TRANSITIONS)
            .filter(([, rule]) => rule.from.includes(status))
            .map(([type, rule]) => (
              <Button key={type} size="sm" variant={rule.danger ? 'danger' : 'gold-outline'} icon={rule.icon} onClick={() => setAction(type)}>
                {t(type === 'verify' ? 'teachers.verify' : type === 'reject' ? 'teachers.rejectVerification' : 'teachers.revokeVerification')}
              </Button>
            ))
        }
      />
      <CardBody>
        <DescriptionList
          items={[
            { label: t('teachers.verificationStatus'), value: <VerificationBadge status={status} /> },
            { label: t('teachers.verificationNote'), value: profile.verificationNote, full: true },
            { label: t('teachers.reviewedAt'), value: profile.verificationReviewedAt && formatDateTime(profile.verificationReviewedAt) },
            { label: t('teachers.verifiedBy'), value: profile.verifiedBy?.fullName },
          ]}
        />
      </CardBody>
      {copy && (
        <ConfirmDialog
          open
          onClose={() => !mutation.isPending && setAction(null)}
          title={copy.title}
          body={copy.body}
          tone={TRANSITIONS[action].danger ? 'danger' : 'primary'}
          withReason
          reasonRequired={TRANSITIONS[action].required}
          reasonLabel={t('teachers.verificationNote')}
          reasonPlaceholder={t('teachers.notePlaceholder')}
          confirmLabel={t(action === 'verify' ? 'teachers.verify' : action === 'reject' ? 'teachers.rejectVerification' : 'teachers.revokeVerification')}
          loading={mutation.isPending}
          onConfirm={(note) => mutation.mutate({ type: action, note })}
        />
      )}
    </Card>
  );
}
