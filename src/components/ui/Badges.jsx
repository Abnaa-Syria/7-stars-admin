import clsx from 'clsx';
import { BadgeCheck, Crown, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';

export function Badge({ tone, dot, icon: Icon, children, className, title }) {
  return (
    <span className={clsx('badge', tone && `badge--${tone}`, className)} title={title}>
      {dot && <span className="badge__dot" />}
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

const STATUS_TONES = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'warning',
  BLOCKED: 'danger',
  DELETED: 'muted',
};

/** Shared tone map for domain enums shown across admin lists. */
export const ENUM_TONES = {
  DRAFT: 'muted',
  PUBLISHED: 'success',
  ARCHIVED: 'muted',
  SUSPENDED: 'danger',
  ACTIVE: 'success',
  INACTIVE: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'danger',
  CANCELLED: 'muted',
  CANCELED: 'muted',
  COMPLETED: 'success',
  BLOCKED: 'danger',
  SUBMITTED: 'info',
  IN_PROGRESS: 'warning',
  EXPIRED: 'muted',
  GRADED: 'success',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  OPEN: 'info',
  PAID: 'success',
  VOID: 'muted',
  UNCOLLECTIBLE: 'danger',
  REFUNDED: 'warning',
  PARTIALLY_REFUNDED: 'warning',
  RECEIVED: 'info',
  PROCESSING: 'warning',
  PROCESSED: 'success',
  IGNORED: 'muted',
  TRIALING: 'info',
  PAST_DUE: 'danger',
  GRACE_PERIOD: 'warning',
  INCOMPLETE: 'warning',
};

/**
 * Localized enum badge. `ns` is the i18n path under enums.*, e.g. `quizStatus`.
 * Falls back to the raw value when a translation is missing.
 */
export function EnumBadge({ value, ns, toneMap = ENUM_TONES, dot = true }) {
  const { t } = useI18n();
  if (!value) return null;
  const label = ns ? t(`enums.${ns}.${value}`, null, value) : value;
  return (
    <Badge tone={toneMap[value] || 'muted'} dot={dot}>
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {t(`enums.status.${status}`, null, status)}
    </Badge>
  );
}

const VERIFICATION_TONES = { VERIFIED: 'gold', PENDING: 'info', REJECTED: 'danger', UNVERIFIED: 'muted' };

export function VerificationBadge({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return (
    <Badge tone={VERIFICATION_TONES[status]} icon={status === 'VERIFIED' ? BadgeCheck : undefined}>
      {t(`enums.verification.${status}`, null, status)}
    </Badge>
  );
}

export function EmailVerificationBadge({ verifiedAt }) {
  const { t } = useI18n();
  return <Badge tone={verifiedAt ? 'success' : 'muted'}>{t(verifiedAt ? 'enums.emailVerification.verified' : 'enums.emailVerification.unverified')}</Badge>;
}

/** Localized role chip; system roles use translated names, custom roles show their stored name. */
export function RoleBadge({ role }) {
  const { t } = useI18n();
  if (!role) return null;
  const label = role.isSystem ? t(`roles.system.${role.slug}`, null, role.name) : role.name;
  const isSuper = role.slug === 'super-admin';
  return (
    <Badge tone={isSuper ? 'gold' : role.isSystem ? undefined : 'info'} icon={isSuper ? Crown : role.isSystem ? undefined : ShieldCheck}>
      {label}
    </Badge>
  );
}

export function RoleList({ roles = [] }) {
  if (!roles.length) return <span className="subtle">—</span>;
  return (
    <span className="badge-list">
      {roles.map((r) => (
        <RoleBadge key={r.id || r.slug} role={r} />
      ))}
    </span>
  );
}
