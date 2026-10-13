import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { P } from '@/utils/permissions';
import { Button, PageHeader, QueryState, Tabs } from '@/components/ui';
import { ACCOUNT_KINDS } from './config';
import { useAccountActions } from './useAccountActions';
import {
  AccountHero,
  AdminSessionsPanel,
  AuditActivityPanel,
  OverviewPanel,
  SecurityPanel,
  StudentProfilePanel,
  TeacherProfilePanel,
} from './AccountPanels';
import { VerificationPanel } from './VerificationPanel';
import { StudentEnrollmentsPanel, TeacherCoursesPanel } from './EducationPanels';

export default function AccountDetailPage({ kind }) {
  const cfg = ACCOUNT_KINDS[kind];
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  const query = useQuery({
    queryKey: cfg.detailKey(id),
    queryFn: () => cfg.api.get(id).then((r) => r.data),
    enabled: Boolean(id),
  });

  const account = query.data;
  const { items, dialog, isSelf, protectedTarget } = useAccountActions(account, cfg, { onDeleted: () => navigate(cfg.base) });
  const canEdit = can(cfg.perms.update) && account && account.status !== 'DELETED' && !protectedTarget;
  const visibleActions = items.filter((i) => i !== 'divider' && !i.hidden);
  const revokeItem = items.find((i) => i.type === 'revoke' && !i.hidden);

  const tabs = useMemo(() => {
    const hasTeacher = Boolean(account?.teacherProfile);
    const hasStudent = Boolean(account?.studentProfile);
    return [
      { id: 'overview', label: t('users.tabs.overview') },
      {
        id: 'profile',
        label: kind === 'teacher' ? t('users.tabs.professional') : kind === 'student' ? t('users.tabs.studentProfile') : t('users.tabs.profile'),
        hidden: kind === 'user' ? !hasTeacher && !hasStudent : false,
      },
      { id: 'verification', label: t('users.tabs.verification'), hidden: kind === 'student' || (kind === 'user' && !hasTeacher) },
      { id: 'courses', label: t('education.tabs.courses'), hidden: kind !== 'teacher' && !(kind === 'user' && hasTeacher) },
      { id: 'enrollments', label: t('education.tabs.enrollments'), hidden: kind !== 'student' && !(kind === 'user' && hasStudent) },
      { id: 'security', label: t('users.tabs.security') },
      { id: 'sessions', label: t('users.tabs.sessions'), hidden: !can(P.USERS_SESSIONS_MANAGE) },
      { id: 'audit', label: t('users.tabs.audit') },
    ];
  }, [t, kind, account, can]);

  const visibleTabs = tabs.filter((x) => !x.hidden);
  const active = visibleTabs.some((x) => x.id === tab) ? tab : 'overview';

  return (
    <div className="stack-lg">
      <PageHeader
        title={account?.fullName || t(`${cfg.ns}.title`)}
        breadcrumbs={[{ label: t(`${cfg.ns}.title`), to: cfg.base }, { label: account?.fullName || t('common.details') }]}
        actions={
          canEdit && (
            <Button variant="gold-outline" icon={Pencil} to={`${cfg.base}/${id}/edit`}>
              {t('common.edit')}
            </Button>
          )
        }
      />
      <QueryState query={query}>
        {(data) => (
          <>
            <AccountHero
              account={data}
              extra={isSelf ? <span className="badge badge--gold">{t('sessions.current')}</span> : null}
              actions={visibleActions.slice(0, 4).map((item) => (
                <Button key={item.type} size="sm" variant={item.danger ? 'danger' : 'outline'} icon={item.icon} onClick={item.onClick}>
                  {item.label}
                </Button>
              ))}
            />
            {dialog}
            <Tabs tabs={visibleTabs} active={active} onChange={(next) => setParams({ tab: next }, { replace: true })} />
            {active === 'overview' && <OverviewPanel account={data} />}
            {active === 'profile' && (
              <div className="stack-lg">
                {data.teacherProfile && <TeacherProfilePanel profile={data.teacherProfile} />}
                {data.studentProfile && <StudentProfilePanel profile={data.studentProfile} />}
              </div>
            )}
            {active === 'verification' && data.teacherProfile && <VerificationPanel account={data} />}
            {active === 'courses' && <TeacherCoursesPanel teacherId={data.id} />}
            {active === 'enrollments' && <StudentEnrollmentsPanel studentId={data.id} />}
            {active === 'security' && <SecurityPanel account={data} />}
            {active === 'sessions' && <AdminSessionsPanel userId={data.id} actions={revokeItem && <Button size="sm" variant="danger" onClick={revokeItem.onClick}>{t('users.actions.revokeSessions')}</Button>} />}
            {active === 'audit' && <AuditActivityPanel account={data} />}
          </>
        )}
      </QueryState>
    </div>
  );
}

