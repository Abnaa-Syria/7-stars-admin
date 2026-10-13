import { useState } from 'react';
import { Ban, BadgeCheck, LogOut, PauseCircle, PlayCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { usersApi } from '@/api/admin';
import { ACCOUNT_QUERY_PREFIXES } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { ConfirmDialog } from '@/components/ui';
import { isSuperAdminAccount } from './config';

const TRANSITIONS = {
  suspend: { from: ['ACTIVE', 'PENDING_VERIFICATION'], icon: PauseCircle },
  block: { from: ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'], icon: Ban, danger: true },
  reactivate: { from: ['SUSPENDED', 'BLOCKED'], icon: PlayCircle },
};

/**
 * Moderation actions for an account (status transitions, session revocation, deletion).
 * Visibility mirrors the backend rules (self-protection, Super Admin protection, unblock
 * permission); the API still enforces every rule, including last-Super-Admin protection.
 */
export function useAccountActions(account, cfg, { onDeleted } = {}) {
  const { t } = useI18n();
  const { user: me, can } = useAuth();
  const [action, setAction] = useState(null);

  const isSelf = Boolean(account && me?.id === account.id);
  const protectedTarget = isSuperAdminAccount(account) && !me?.isSuperAdmin;
  const deleted = account?.status === 'DELETED';
  const manageable = Boolean(account) && !isSelf && !protectedTarget && !deleted;

  const mutation = useApiMutation(
    ({ type, reason }) => {
      const body = reason ? { reason } : {};
      if (type === 'delete') return usersApi.remove(account.id, body);
      if (type === 'revoke') return usersApi.revokeSessions(account.id);
      if (type === 'verify') return cfg.api.verify(account.id, reason ? { note: reason } : {});
      if (type === 'reject') return cfg.api.reject(account.id, { note: reason });
      if (type === 'revokeVerify') return cfg.api.revoke(account.id, reason ? { note: reason } : {});
      return cfg.api[type](account.id, body);
    },
    {
      invalidate: ACCOUNT_QUERY_PREFIXES,
      onSuccess: (_res, { type }) => {
        setAction(null);
        if (type === 'delete') onDeleted?.();
      },
    },
  );

  const canStatus = can(cfg.perms.status);
  const items = [];
  for (const [type, rule] of Object.entries(TRANSITIONS)) {
    const allowedFrom = rule.from.includes(account?.status);
    const needsUnblock = type === 'reactivate' && account?.status === 'BLOCKED';
    items.push({
      type,
      label: t(`users.actions.${type}`),
      icon: rule.icon,
      danger: rule.danger,
      hidden: !manageable || !canStatus || !allowedFrom || (needsUnblock && !can(P.USERS_UNBLOCK)),
      onClick: () => setAction(type),
    });
  }
  items.push('divider');
  if (cfg.perms.verify) {
    const vs = account?.teacherProfile?.verificationStatus;
    items.push({
      type: 'verify',
      label: t('teachers.verify'),
      icon: BadgeCheck,
      hidden: !manageable || !can(cfg.perms.verify) || !['UNVERIFIED', 'PENDING', 'REJECTED'].includes(vs),
      onClick: () => setAction('verify'),
    });
    items.push({
      type: 'reject',
      label: t('teachers.rejectVerification'),
      icon: Ban,
      danger: true,
      hidden: !manageable || !can(cfg.perms.verify) || !['UNVERIFIED', 'PENDING'].includes(vs),
      onClick: () => setAction('reject'),
    });
    items.push({
      type: 'revokeVerify',
      label: t('teachers.revokeVerification'),
      icon: RotateCcw,
      danger: true,
      hidden: !manageable || !can(cfg.perms.verify) || vs !== 'VERIFIED',
      onClick: () => setAction('revokeVerify'),
    });
    items.push('divider');
  }
  items.push({
    type: 'revoke',
    label: t('users.actions.revokeSessions'),
    icon: LogOut,
    hidden: !account || isSelf || deleted || protectedTarget || !can(P.USERS_SESSIONS_MANAGE),
    onClick: () => setAction('revoke'),
  });
  items.push({
    type: 'delete',
    label: t('users.actions.delete'),
    icon: Trash2,
    danger: true,
    hidden: cfg.kind !== 'user' || !manageable || !can(P.USERS_DELETE),
    onClick: () => setAction('delete'),
  });

  const name = account?.fullName || '';
  const copy = {
    suspend: { title: t('users.confirm.suspendTitle'), body: t('users.confirm.suspendBody', { name }), tone: 'danger', reason: true },
    block: { title: t('users.confirm.blockTitle'), body: t('users.confirm.blockBody', { name }), tone: 'danger', reason: true },
    reactivate: { title: t('users.confirm.reactivateTitle'), body: t('users.confirm.reactivateBody', { name }), tone: 'primary', reason: true },
    revoke: { title: t('users.confirm.revokeTitle'), body: t('users.confirm.revokeBody', { name }), tone: 'danger', reason: false },
    delete: { title: t('users.confirm.deleteTitle'), body: t('users.confirm.deleteBody', { name }), tone: 'danger', reason: true },
    verify: { title: t('teachers.confirm.verifyTitle'), body: t('teachers.confirm.verifyBody', { name }), tone: 'primary', reason: true },
    reject: { title: t('teachers.confirm.rejectTitle'), body: t('teachers.confirm.rejectBody', { name }), tone: 'danger', reason: true, reasonRequired: true },
    revokeVerify: { title: t('teachers.confirm.revokeTitle'), body: t('teachers.confirm.revokeBody', { name }), tone: 'danger', reason: true },
  }[action];

  const dialog = copy ? (
    <ConfirmDialog
      open
      onClose={() => !mutation.isPending && setAction(null)}
      title={copy.title}
      body={copy.body}
      tone={copy.tone}
      withReason={copy.reason}
      reasonRequired={copy.reasonRequired}
      reasonLabel={action === 'verify' || action === 'reject' || action === 'revokeVerify' ? t('teachers.verificationNote') : undefined}
      confirmLabel={
        action === 'revoke'
          ? t('users.actions.revokeSessions')
          : action === 'verify'
            ? t('teachers.verify')
            : action === 'reject'
              ? t('teachers.rejectVerification')
              : action === 'revokeVerify'
                ? t('teachers.revokeVerification')
                : t(`users.actions.${action}`)
      }
      loading={mutation.isPending}
      onConfirm={(reason) => mutation.mutate({ type: action, reason })}
    />
  ) : null;

  return { items, dialog, isSelf, protectedTarget };
}
