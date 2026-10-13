import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Ban,
  CalendarDays,
  CalendarPlus,
  Clock,
  Crown,
  GraduationCap,
  MonitorSmartphone,
  PauseCircle,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { dashboardApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { P } from '@/utils/permissions';
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Identity, PageHeader, RoleList, Skeleton, StatCard, StatusBadge } from '@/components/ui';
import { auditActionLabel } from '@/pages/audit/auditLabels';

function TrendChart({ series = [] }) {
  const { formatNumber, locale } = useI18n();
  const max = Math.max(1, ...series.map((d) => d.count));
  const dayFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  return (
    <div className="bars" role="img">
      {series.map((d) => (
        <div key={d.date} className="bars__col" title={`${d.date}: ${d.count}`}>
          <span className="bars__value">{d.count ? formatNumber(d.count) : ''}</span>
          <span className="bars__bar" style={{ height: `${(d.count / max) * 100}%` }} />
          <span className="bars__label">{dayFmt.format(new Date(`${d.date}T00:00:00Z`))}</span>
        </div>
      ))}
    </div>
  );
}

function Distribution({ title, entries, total }) {
  const { formatNumber } = useI18n();
  return (
    <div className="stack-sm">
      <div className="section-title" style={{ marginBottom: 4 }}>
        {title}
      </div>
      {entries.map((e) => {
        const pct = total ? Math.round((e.value / total) * 100) : 0;
        return (
          <div key={e.key} className="meter">
            <div className="meter__row">
              <span>{e.label}</span>
              <span className="muted">
                {formatNumber(e.value)} · {pct}%
              </span>
            </div>
            <div className="meter__track">
              <div className="meter__fill" style={{ width: `${pct}%`, '--meter-color': e.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { t, formatNumber, formatRelative, formatDateTime } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: queryKeys.dashboard, queryFn: () => dashboardApi.get().then((r) => r.data) });
  const data = query.data;
  const s = data?.stats || {};
  const loading = query.isPending;
  const n = (v) => formatNumber(v ?? 0);

  const header = (
    <PageHeader
      title={t('dashboard.title')}
      subtitle={data ? `${t('dashboard.subtitle')} · ${t('dashboard.updatedAt', { time: formatDateTime(data.generatedAt) })}` : t('dashboard.subtitle')}
      actions={
        <Button icon={RefreshCw} variant="outline" size="sm" loading={query.isFetching && !loading} onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      }
    />
  );

  if (query.isError) {
    return (
      <>
        {header}
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      </>
    );
  }

  const stats = [
    { key: 'totalUsers', icon: Users, value: s.totalUsers },
    { key: 'teachers', icon: UserRound, value: s.teachers, tone: 'info' },
    { key: 'students', icon: GraduationCap, value: s.students, tone: 'info' },
    { key: 'activeAccounts', icon: UserCheck, value: s.activeAccounts, tone: 'success' },
    { key: 'pendingVerification', icon: Clock, value: s.pendingVerification, tone: 'warning' },
    { key: 'suspendedAccounts', icon: PauseCircle, value: s.suspendedAccounts, tone: 'warning' },
    { key: 'blockedAccounts', icon: Ban, value: s.blockedAccounts, tone: 'danger' },
    { key: 'registrationsToday', icon: CalendarPlus, value: s.registrationsToday },
    { key: 'registrationsThisMonth', icon: CalendarDays, value: s.registrationsThisMonth },
    { key: 'pendingTeacherVerification', icon: BadgeCheck, value: s.pendingTeacherVerification, tone: 'warning' },
    { key: 'activeSessions', icon: MonitorSmartphone, value: s.activeSessions, tone: 'success' },
    { key: 'superAdmins', icon: Crown, value: s.superAdmins },
  ];

  const dist = data?.distribution;
  const roleTotal = dist ? dist.byRole.teachers + dist.byRole.students + dist.byRole.superAdmins : 0;
  const statusTotal = dist ? Object.values(dist.byStatus).reduce((a, b) => a + b, 0) : 0;
  const langTotal = dist ? Object.values(dist.byLanguage).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="stack-lg">
      {header}

      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.key} label={t(`dashboard.${stat.key}`)} value={n(stat.value)} icon={stat.icon} tone={stat.tone} loading={loading} />
        ))}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <Card>
          <CardHeader title={t('dashboard.registrationsTrend')} icon={Activity} subtitle={data?.timezone && <span className="ltr">{data.timezone}</span>} />
          <CardBody>{loading ? <Skeleton height={160} /> : <TrendChart series={data.registrationsTrend} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.userDistribution')} icon={Users} />
          <CardBody>
            {loading ? (
              <div className="stack">
                <Skeleton height={60} />
                <Skeleton height={60} />
              </div>
            ) : (
              <div className="stack-lg">
                <Distribution
                  title={t('dashboard.byRole')}
                  total={roleTotal}
                  entries={[
                    { key: 'teachers', label: t('roles.system.teacher'), value: dist.byRole.teachers, color: 'var(--info)' },
                    { key: 'students', label: t('roles.system.student'), value: dist.byRole.students },
                    { key: 'superAdmins', label: t('roles.system.super-admin'), value: dist.byRole.superAdmins, color: 'var(--gold-strong)' },
                  ]}
                />
                <Distribution
                  title={t('dashboard.byStatus')}
                  total={statusTotal}
                  entries={Object.entries(dist.byStatus).map(([k, v]) => ({
                    key: k,
                    label: t(`enums.status.${k}`),
                    value: v,
                    color: { ACTIVE: 'var(--success)', PENDING_VERIFICATION: 'var(--warning)', SUSPENDED: 'var(--warning)', BLOCKED: 'var(--danger)', DELETED: 'var(--text-subtle)' }[k],
                  }))}
                />
                <Distribution
                  title={t('dashboard.byLanguage')}
                  total={langTotal}
                  entries={Object.entries(dist.byLanguage).map(([k, v]) => ({ key: k, label: t(`enums.language.${k}`), value: v }))}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid-2">
        <Card>
          <CardHeader
            title={t('dashboard.recentRegistrations')}
            icon={CalendarPlus}
            actions={
              can(P.USERS_READ) && (
                <Link to="/users" style={{ fontSize: 13 }}>
                  {t('dashboard.viewAll')}
                </Link>
              )
            }
          />
          <CardBody flush>
            {loading ? (
              <div className="skeleton-rows">
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </div>
            ) : data.recentRegistrations.length ? (
              <div className="feed">
                {data.recentRegistrations.map((u) => (
                  <div
                    key={u.id}
                    className="feed__item"
                    style={{ alignItems: 'center', cursor: can(P.USERS_READ) ? 'pointer' : 'default' }}
                    onClick={() => can(P.USERS_READ) && navigate(`/users/${u.id}`)}
                  >
                    <div className="grow">
                      <Identity user={u} />
                    </div>
                    <RoleList roles={u.roles} />
                    <StatusBadge status={u.status} />
                    <span className="feed__meta nowrap">{formatRelative(u.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t('dashboard.noRegistrations')} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard.recentActivity')}
            icon={ShieldAlert}
            actions={
              can(P.AUDIT_READ) && (
                <Link to="/audit-logs" style={{ fontSize: 13 }}>
                  {t('dashboard.viewAll')}
                </Link>
              )
            }
          />
          <CardBody flush>
            {loading ? (
              <div className="skeleton-rows">
                <Skeleton height={36} />
                <Skeleton height={36} />
              </div>
            ) : data.recentActivity.length ? (
              <div className="feed">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="feed__item">
                    <span className="feed__dot">
                      <ShieldAlert size={15} />
                    </span>
                    <div className="grow">
                      <div className="feed__title">{auditActionLabel(t, a.action)}</div>
                      <div className="feed__meta">
                        {a.actor?.fullName || t('audit.system')} · <span className="ltr">{a.ipAddress || '—'}</span>
                      </div>
                    </div>
                    <span className="feed__meta nowrap">{formatRelative(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t('dashboard.noActivity')} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
