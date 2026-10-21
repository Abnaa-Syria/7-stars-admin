import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, ExternalLink, Globe2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { usersApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { P } from '@/utils/permissions';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DescriptionList,
  EmailVerificationBadge,
  EmptyState,
  RoleList,
  StatusBadge,
  VerificationBadge,
} from '@/components/ui';
import { auditActionLabel } from '@/pages/audit/auditLabels';

export function AccountHero({ account, actions, extra }) {
  const { t, formatDate } = useI18n();
  return (
    <Card>
      <div className="profile-hero">
        <Avatar src={account.avatar?.url || account.teacherProfile?.profileImage?.url || account.studentProfile?.profileImage?.url} name={account.fullName} size={72} />
        <div className="grow">
          <div className="row wrap" style={{ gap: 10 }}>
            <h2 className="profile-hero__name">{account.fullName}</h2>
            <StatusBadge status={account.status} />
            {account.teacherProfile && <VerificationBadge status={account.teacherProfile.verificationStatus} />}
            {extra}
          </div>
          <div className="profile-hero__meta">
            <span className="ltr">
              <Mail size={14} />
              {account.email}
            </span>
            {account.phone && (
              <span className="ltr">
                <Phone size={14} />
                {account.phone}
              </span>
            )}
            <span>
              <CalendarDays size={14} />
              {t('users.joined')}: {formatDate(account.createdAt)}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <RoleList roles={account.roles} />
          </div>
        </div>
        {actions && <div className="row wrap">{actions}</div>}
      </div>
    </Card>
  );
}

export function OverviewPanel({ account }) {
  const { t, formatDateTime, formatRelative } = useI18n();
  return (
    <Card>
      <CardHeader title={t('users.accountSection')} />
      <CardBody>
        <DescriptionList
          items={[
            { label: t('users.fullName'), value: account.fullName },
            { label: t('users.email'), value: <span className="ltr">{account.email}</span> },
            { label: t('users.phone'), value: account.phone && <span className="ltr">{account.phone}</span> },
            { label: t('users.status'), value: <StatusBadge status={account.status} /> },
            { label: t('users.verification'), value: <EmailVerificationBadge verifiedAt={account.emailVerifiedAt} /> },
            { label: t('users.language'), value: t(`enums.language.${account.preferredLanguage}`) },
            { label: t('users.timezone'), value: <span className="ltr">{account.timezone}</span> },
            { label: t('users.roles'), value: <RoleList roles={account.roles} /> },
            { label: t('users.joined'), value: formatDateTime(account.createdAt) },
            { label: t('users.lastLogin'), value: account.lastLoginAt ? `${formatDateTime(account.lastLoginAt)} (${formatRelative(account.lastLoginAt)})` : t('common.never') },
            { label: t('users.statusReason'), value: account.statusReason, hidden: !account.statusReason, full: true },
          ]}
        />
      </CardBody>
    </Card>
  );
}

export function SecurityPanel({ account }) {
  const { t, formatDateTime, formatNumber } = useI18n();
  const s = account.sessionsSummary || {};
  return (
    <Card>
      <CardHeader title={t('users.securitySection')} icon={ShieldCheck} />
      <CardBody>
        <DescriptionList
          items={[
            { label: t('users.verification'), value: account.emailVerifiedAt ? formatDateTime(account.emailVerifiedAt) : <EmailVerificationBadge verifiedAt={null} /> },
            { label: t('users.phoneVerified'), value: account.phoneVerifiedAt ? formatDateTime(account.phoneVerifiedAt) : t('common.no') },
            { label: t('users.passwordChangedAt'), value: account.passwordChangedAt ? formatDateTime(account.passwordChangedAt) : t('common.never') },
            { label: t('users.twoFactor'), value: account.isTwoFactorEnabled ? t('common.enabled') : t('common.disabled') },
            { label: t('users.lastLogin'), value: account.lastLoginAt ? formatDateTime(account.lastLoginAt) : t('common.never') },
            { label: t('users.lastLoginIp'), value: account.lastLoginIp && <span className="mono">{account.lastLoginIp}</span> },
            { label: t('users.sessionsActive'), value: formatNumber(s.active) },
            { label: t('users.sessionsTotal'), value: formatNumber(s.total) },
            { label: t('users.lastActivity'), value: s.lastActivityAt ? formatDateTime(s.lastActivityAt) : t('common.never') },
            { label: t('users.statusChangedAt'), value: account.statusChangedAt && formatDateTime(account.statusChangedAt) },
          ]}
        />
      </CardBody>
    </Card>
  );
}

function deviceLabel(s, t) {
  if (s.deviceName && !/mozilla/i.test(s.deviceName)) return s.deviceName;
  const ua = s.userAgent || s.deviceName || '';
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\//i.test(ua) ? 'Chrome' : /firefox\//i.test(ua) ? 'Firefox' : /safari\//i.test(ua) ? 'Safari' : null;
  const os = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : null;
  return [browser, os].filter(Boolean).join(' · ') || t('sessions.unknownDevice');
}

/** Sessions table. Provide `query` (React Query result) or `userId` to load admin sessions. */
export function SessionsTable({ query, onRevoke, revokingId }) {
  const { t, formatDateTime, formatRelative } = useI18n();
  const columns = [
    {
      key: 'device',
      header: t('sessions.device'),
      render: (s) => (
        <div>
          <div className="cell-title">{deviceLabel(s, t)}</div>
          <div className="field__hint">{s.platform || '—'}</div>
        </div>
      ),
    },
    { key: 'ip', header: t('sessions.ip'), render: (s) => <span className="mono">{s.ipAddress || '—'}</span> },
    { key: 'lastUsed', header: t('sessions.lastUsed'), render: (s) => <span title={formatDateTime(s.lastUsedAt)}>{formatRelative(s.lastUsedAt)}</span> },
    { key: 'created', header: t('sessions.created'), render: (s) => formatDateTime(s.createdAt) },
    { key: 'expires', header: t('sessions.expires'), render: (s) => formatDateTime(s.expiresAt) },
    {
      key: 'state',
      header: t('sessions.state'),
      render: (s) =>
        s.isCurrent ? (
          <Badge tone="gold">{t('sessions.current')}</Badge>
        ) : s.isActive ? (
          <Badge tone="success" dot>
            {t('sessions.active')}
          </Badge>
        ) : (
          <Badge tone="muted" title={s.revokedReason || undefined}>
            {t('sessions.revoked')}
          </Badge>
        ),
    },
  ];
  if (onRevoke) {
    columns.push({
      key: 'actions',
      header: '',
      className: 'actions-cell',
      render: (s) =>
        s.isActive && !s.isCurrent ? (
          <button type="button" className="btn btn--danger btn--sm" disabled={revokingId === s.id} onClick={() => onRevoke(s)}>
            {t('sessions.revoke')}
          </button>
        ) : null,
    });
  }
  return <DataTable columns={columns} rows={query.data} query={query} empty={<EmptyState title={t('sessions.empty')} />} />;
}

export function AdminSessionsPanel({ userId, actions }) {
  const { t } = useI18n();
  const query = useQuery({ queryKey: queryKeys.userSessions(userId), queryFn: () => usersApi.sessions(userId).then((r) => r.data) });
  return (
    <Card>
      <CardHeader title={t('users.tabs.sessions')} actions={actions} />
      <CardBody flush>
        <SessionsTable query={query} />
      </CardBody>
    </Card>
  );
}

/** Latest audit entries embedded in the account detail response, with a link to the full log. */
export function AuditActivityPanel({ account }) {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const entries = account.auditSummary || [];
  return (
    <Card>
      <CardHeader
        title={t('users.tabs.audit')}
        actions={
          can(P.AUDIT_READ) && (
            <Link to={`/audit-logs?entityId=${account.id}`} className="row" style={{ fontSize: 13 }}>
              {t('dashboard.viewAll')}
              <ExternalLink size={13} />
            </Link>
          )
        }
      />
      <CardBody flush>
        {entries.length ? (
          <div className="feed">
            {entries.map((e) => (
              <div key={e.id} className="feed__item">
                <span className="feed__dot">
                  <Clock size={15} />
                </span>
                <div className="grow">
                  <div className="feed__title">{auditActionLabel(t, e.action)}</div>
                  <div className="feed__meta">
                    {e.actor?.fullName || t('audit.system')} · <span className="ltr">{e.ipAddress || '—'}</span>
                  </div>
                </div>
                <span className="feed__meta nowrap">{formatDateTime(e.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t('audit.empty')} />
        )}
      </CardBody>
    </Card>
  );
}

export function TeacherProfilePanel({ profile, actions }) {
  const { t, formatNumber } = useI18n();
  if (!profile) return <Card><EmptyState title={t('users.noProfile')} /></Card>;
  return (
    <Card>
      <CardHeader title={t('teachers.professionalProfile')} actions={actions} />
      {profile.coverImage?.url && <img src={profile.coverImage.url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }} />}
      <CardBody>
        <DescriptionList
          items={[
            { label: `${t('teachers.displayName')} — ${t('common.arabic')}`, value: profile.displayNameAr ?? profile.displayName },
            { label: `${t('teachers.displayName')} — ${t('common.english')}`, value: profile.displayNameEn },
            { label: t('teachers.headline'), value: profile.headline },
            { label: t('teachers.specialization'), value: profile.specialization },
            { label: t('teachers.yearsOfExperience'), value: profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined ? formatNumber(profile.yearsOfExperience) : null },
            { label: t('teachers.institution'), value: profile.institution },
            { label: t('teachers.publicProfileSlug'), value: profile.publicProfileSlug && <span className="mono">{profile.publicProfileSlug}</span> },
            {
              label: t('teachers.isPublic'),
              value: (
                <Badge tone={profile.isPublic ? 'success' : 'muted'} icon={Globe2}>
                  {profile.isPublic ? t('common.yes') : t('common.no')}
                </Badge>
              ),
            },
            { label: t('teachers.verificationStatus'), value: <VerificationBadge status={profile.verificationStatus} /> },
            { label: t('teachers.biography'), value: profile.biography && <p style={{ whiteSpace: 'pre-line' }}>{profile.biography}</p>, full: true },
          ]}
        />
      </CardBody>
    </Card>
  );
}

export function StudentProfilePanel({ profile, actions }) {
  const { t, formatDate } = useI18n();
  if (!profile) return <Card><EmptyState title={t('users.noProfile')} /></Card>;
  return (
    <Card>
      <CardHeader title={t('students.studentProfile')} actions={actions} />
      <CardBody>
        <DescriptionList
          items={[
            { label: t('students.displayName'), value: profile.displayName },
            { label: t('students.institution'), value: profile.institution },
            { label: t('students.gradeLevel'), value: profile.gradeLevel },
            { label: t('students.birthDate'), value: profile.birthDate && formatDate(`${profile.birthDate}T00:00:00`) },
            { label: t('students.bio'), value: profile.bio && <p style={{ whiteSpace: 'pre-line' }}>{profile.bio}</p>, full: true },
          ]}
        />
      </CardBody>
    </Card>
  );
}
