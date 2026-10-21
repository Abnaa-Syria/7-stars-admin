import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { dashboardApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { P } from '@/utils/permissions';
import { Button, EmptyState, ErrorState, Identity, Skeleton } from '@/components/ui';
import { auditActionLabel } from '@/pages/audit/auditLabels';

function trendDelta(series = []) {
  if (series.length < 4) return null;
  const mid = Math.floor(series.length / 2);
  const prev = series.slice(0, mid).reduce((a, d) => a + d.count, 0);
  const next = series.slice(mid).reduce((a, d) => a + d.count, 0);
  if (!prev) return next ? 100 : 0;
  return Math.round(((next - prev) / prev) * 100);
}

function Sparkline({ series = [], gold }) {
  if (series.length < 2) return null;
  const max = Math.max(1, ...series.map((d) => d.count));
  const w = 96;
  const h = 28;
  const d = series
    .map((point, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - 3 - (point.count / max) * (h - 6);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = series[series.length - 1];
  const lx = w;
  const ly = h - 3 - (last.count / max) * (h - 6);
  const color = gold ? 'var(--gold-strong)' : 'var(--text-subtle)';
  return (
    <svg className="sparkline" width="96" height="28" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

function AreaChart({ series = [], formatNumber, locale }) {
  const w = 760;
  const h = 220;
  const left = 40;
  const top = 16;
  const bottom = 20;
  const max = Math.max(1, ...series.map((d) => d.count));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const innerW = w - left;
  const innerH = h - top - bottom;
  const points = series.map((point, i) => {
    const x = left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = top + innerH - (point.count / niceMax) * innerH;
    return { x, y, ...point };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${top + innerH} L${left},${top + innerH} Z`;
  const ticks = [1, 0.66, 0.33, 0];
  const dayFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const labels = series.filter((_, i) => i === 0 || i === series.length - 1 || i % 2 === 0);

  return (
    <>
      <svg className="area-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="dashGoldFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ecc246" stopOpacity="0.12" />
            <stop offset="90%" stopColor="#ecc246" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = top + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={left} x2={w} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
              <text x="0" y={y + 4}>
                {formatNumber(Math.round(niceMax * t))}
              </text>
            </g>
          );
        })}
        {points.length > 1 && <path d={area} fill="url(#dashGoldFill)" />}
        {points.length > 1 && <path d={line} fill="none" stroke="#ecc246" strokeWidth="1.75" strokeLinecap="round" />}
      </svg>
      <div className="area-axis">
        {labels.map((d, i) => (
          <span key={d.date} className={i === labels.length - 1 ? 'on' : undefined}>
            {dayFmt.format(new Date(`${d.date}T00:00:00Z`))}
          </span>
        ))}
      </div>
    </>
  );
}

function roleKind(user) {
  const slugs = (user.roles || []).map((r) => r.slug);
  if (slugs.includes('teacher')) return 'teacher';
  if (slugs.includes('student')) return 'student';
  return 'staff';
}

export default function DashboardPage() {
  const { t, formatNumber, formatRelative, formatDateTime, locale } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: queryKeys.dashboard, queryFn: () => dashboardApi.get().then((r) => r.data) });
  const data = query.data;
  const s = data?.stats || {};
  const loading = query.isPending;
  const n = (v) => formatNumber(v ?? 0);
  const series = data?.registrationsTrend || [];
  const delta = trendDelta(series);
  const peak = series.reduce((m, d) => Math.max(m, d.count), 0);
  const avg = series.length ? Math.round(series.reduce((a, d) => a + d.count, 0) / series.length) : 0;
  const dist = data?.distribution;
  const roleTotal = dist ? dist.byRole.teachers + dist.byRole.students + dist.byRole.superAdmins : 0;
  const langTotal = dist ? Object.values(dist.byLanguage).reduce((a, b) => a + b, 0) : 0;
  const engagement = s.totalUsers ? Math.round((s.activeAccounts / s.totalUsers) * 1000) / 10 : 0;

  if (query.isError) {
    return (
      <div className="dash">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }

  const kpis = [
    { key: 'totalUsers', value: s.totalUsers, hint: t('dashboard.trailing7'), gold: true, chip: delta == null ? null : `${delta > 0 ? '+' : ''}${delta}%` },
    { key: 'teachers', value: s.teachers, hint: t('dashboard.teachersHint') },
    { key: 'students', value: s.students, hint: t('dashboard.studentsHint'), gold: true },
    { key: 'activeAccounts', value: s.activeAccounts, hint: t('dashboard.mauHint'), chip: t('dashboard.engagement', { pct: engagement }), muted: true },
  ];

  const strip = [
    { tone: 'var(--warning)', label: t('dashboard.pendingVerification'), value: s.pendingVerification },
    { tone: 'var(--danger)', label: t('dashboard.suspendedAccounts'), value: s.suspendedAccounts },
    { tone: 'var(--text-subtle)', label: t('dashboard.blockedAccounts'), value: s.blockedAccounts },
    { tone: 'var(--success)', label: t('dashboard.activeSessions'), value: s.activeSessions },
    { tone: null, label: t('dashboard.registrationsToday'), value: s.registrationsToday, gold: true },
  ];

  const langEntries = dist
    ? Object.entries(dist.byLanguage).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="dash">
      <div className="dash-hero">
        <div>
          <h1>
            {t('dashboard.title')}
            {data?.generatedAt && (
              <span className="dash-live">
                <span className="dash-live__dot" />
                {t('dashboard.updatedAt', { time: formatDateTime(data.generatedAt) })}
              </span>
            )}
          </h1>
          <p className="dash-hero__sub">{t('dashboard.subtitle')}</p>
        </div>
        <Button icon={RefreshCw} variant="outline" size="sm" loading={query.isFetching && !loading} onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>

      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.key} className="kpi">
            <div className="kpi__top">
              <div>
                <div className="kpi__label">{t(`dashboard.${kpi.key}`)}</div>
                <div className="kpi__value">{loading ? <Skeleton height={40} width={96} /> : n(kpi.value)}</div>
              </div>
              {kpi.chip != null && <span className={kpi.muted ? 'kpi__chip kpi__chip--muted' : 'kpi__chip'}>{kpi.chip}</span>}
            </div>
            <div className="kpi__foot">
              <span>{kpi.hint}</span>
              {!loading && <Sparkline series={series} gold={kpi.gold} />}
            </div>
          </article>
        ))}
      </section>

      <section className="status-strip">
        {strip.map((item, i) => (
          <div key={item.label} style={{ display: 'contents' }}>
            {i > 0 && <span className="status-strip__sep" />}
            <div className="status-strip__item">
              {item.tone && <span className="status-strip__dot" style={{ background: item.tone }} />}
              <span>{item.label}</span>
              <strong className={item.gold ? 'gold' : undefined}>{loading ? '—' : n(item.value)}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-split">
        <div className="dash-panel">
          <div className="dash-panel__head">
            <div>
              <h2>{t('dashboard.registrationsTrend')}</h2>
              <p>{t('dashboard.chartSubtitle')}</p>
            </div>
          </div>
          {loading ? <Skeleton height={240} /> : <AreaChart series={series} formatNumber={formatNumber} locale={locale} />}
          <div className="chart-foot">
            <span>
              {t('dashboard.peak')}: <strong>{n(peak)} / {t('dashboard.perDay')}</strong>
              <span className="status-strip__sep" style={{ display: 'inline-block', margin: '0 10px', verticalAlign: 'middle' }} />
              {t('dashboard.average')}: <strong>{n(avg)} / {t('dashboard.perDay')}</strong>
            </span>
            {data?.timezone && <span className="ltr">{data.timezone}</span>}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel__head">
            <div>
              <h2>{t('dashboard.userDistribution')}</h2>
              <p>{t('dashboard.distributionSubtitle')}</p>
            </div>
          </div>
          {loading || !dist ? (
            <Skeleton height={180} />
          ) : (
            <>
              <div className="meter-block">
                <div className="meter-block__title">
                  <span>{t('dashboard.byRole')}</span>
                  <span>{n(roleTotal)}</span>
                </div>
                {[
                  { label: t('roles.system.student'), value: dist.byRole.students, cls: '' },
                  { label: t('roles.system.teacher'), value: dist.byRole.teachers, cls: 'alt' },
                  { label: t('roles.system.super-admin'), value: dist.byRole.superAdmins, cls: 'mute' },
                ].map((row) => {
                  const pct = roleTotal ? Math.round((row.value / roleTotal) * 1000) / 10 : 0;
                  return (
                    <div key={row.label} className="meter" style={{ marginBottom: 10 }}>
                      <div className="meter__row">
                        <span>{row.label}</span>
                        <span className="muted">
                          {n(row.value)} · {pct}%
                        </span>
                      </div>
                      <div className="meter-thin">
                        <span className={row.cls} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="meter-block">
                <div className="meter-block__title">
                  <span>{t('dashboard.byLanguage')}</span>
                  <span>{n(langTotal)}</span>
                </div>
                {langEntries.map(([key, value]) => {
                  const pct = langTotal ? Math.round((value / langTotal) * 100) : 0;
                  return (
                    <div key={key} className="meter" style={{ marginBottom: 10 }}>
                      <div className="meter__row">
                        <span>{t(`enums.language.${key}`, null, key)}</span>
                        <span className="muted">
                          {n(value)} · {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="meter-thin" style={{ display: 'flex', height: 6 }}>
                  {langEntries.map(([key, value], i) => (
                    <span key={key} className={i ? 'mute' : ''} style={{ width: `${langTotal ? (value / langTotal) * 100 : 0}%` }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="dash-feeds">
        <div className="dash-panel">
          <div className="dash-panel__head">
            <div>
              <h2>{t('dashboard.recentRegistrations')}</h2>
              <p>{t('dashboard.registrationsSubtitle')}</p>
            </div>
            {can(P.USERS_READ) && (
              <Link to="/users" className="dash-panel__link">
                {t('dashboard.viewAll')} <ArrowRight size={14} />
              </Link>
            )}
          </div>
          {loading ? (
            <Skeleton height={160} />
          ) : data.recentRegistrations.length ? (
            data.recentRegistrations.map((u) => {
              const kind = roleKind(u);
              return (
                <div
                  key={u.id}
                  className="dash-row"
                  style={{ cursor: can(P.USERS_READ) ? 'pointer' : 'default' }}
                  onClick={() => can(P.USERS_READ) && navigate(`/users/${u.id}`)}
                >
                  <Identity user={u} size={36} />
                  <span className={kind === 'teacher' ? 'role-pill role-pill--gold' : 'role-pill'}>
                    {kind === 'teacher' ? t('roles.system.teacher') : kind === 'student' ? t('roles.system.student') : t('dashboard.staff')}
                  </span>
                  <span className="dash-row__meta">{formatRelative(u.createdAt)}</span>
                </div>
              );
            })
          ) : (
            <EmptyState title={t('dashboard.noRegistrations')} />
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel__head">
            <div>
              <h2>{t('dashboard.recentActivity')}</h2>
              <p>{t('dashboard.activitySubtitle')}</p>
            </div>
            {can(P.AUDIT_READ) && (
              <Link to="/audit-logs" className="dash-panel__link">
                {t('dashboard.viewAll')} <ArrowRight size={14} />
              </Link>
            )}
          </div>
          {loading ? (
            <Skeleton height={160} />
          ) : data.recentActivity.length ? (
            data.recentActivity.map((a) => {
              const danger = /BLOCK|FAIL|SUSPEND|DELETE/i.test(a.action || '');
              return (
                <div key={a.id} className="dash-row" style={{ alignItems: 'flex-start' }}>
                  <span className={danger ? 'dash-icon dash-icon--danger' : 'dash-icon'}>
                    <ShieldAlert size={15} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{auditActionLabel(t, a.action)}</div>
                    <div className="dash-row__meta">
                      {a.actor?.fullName || t('audit.system')}
                      {a.ipAddress ? ` · ${a.ipAddress}` : ''}
                    </div>
                  </div>
                  <span className="dash-row__meta">{formatRelative(a.createdAt)}</span>
                </div>
              );
            })
          ) : (
            <EmptyState title={t('dashboard.noActivity')} />
          )}
        </div>
      </section>
    </div>
  );
}
