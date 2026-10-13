import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { rolesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  DropdownMenu,
  EmailVerificationBadge,
  FilterBar,
  Identity,
  PageHeader,
  Pagination,
  RoleList,
  StatusBadge,
  VerificationBadge,
} from '@/components/ui';
import { ACCOUNT_KINDS, LANGUAGES, USER_STATUSES, VERIFICATION_STATUSES } from './config';
import { useAccountActions } from './useAccountActions';

function RowActions({ account, cfg }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { items, dialog } = useAccountActions(account, cfg);
  return (
    <>
      <DropdownMenu
        label={t('common.actions')}
        items={[
          { label: t('common.view'), icon: Eye, onClick: () => navigate(`${cfg.base}/${account.id}`) },
          { label: t('common.edit'), icon: Pencil, hidden: !can(cfg.perms.update) || account.status === 'DELETED', onClick: () => navigate(`${cfg.base}/${account.id}/edit`) },
          'divider',
          ...items,
        ]}
      />
      {dialog}
    </>
  );
}

/** API query: date-only "to" filters include the whole day. */
function toApiParams(params) {
  const { createdTo, ...rest } = params;
  return { ...rest, ...(createdTo && { createdTo: `${createdTo}T23:59:59.999` }) };
}

export default function AccountListPage({ kind }) {
  const cfg = ACCOUNT_KINDS[kind];
  const { t, formatDate, formatRelative } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const list = useListParams();
  const { params, setParams } = list;

  const query = useQuery({
    queryKey: cfg.listKey(params),
    queryFn: () => cfg.api.list(toApiParams(params)),
    placeholderData: keepPreviousData,
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles({ limit: 100 }),
    queryFn: () => rolesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: kind === 'user' && can(P.ROLES_READ),
    staleTime: 5 * 60_000,
  });

  const statusOptions = USER_STATUSES.map((s) => ({ value: s, label: t(`enums.status.${s}`) }));
  const filters = [
    ...(kind === 'user' && rolesQuery.data
      ? [{ key: 'role', label: t('users.role'), options: rolesQuery.data.map((r) => ({ value: r.slug, label: r.isSystem ? t(`roles.system.${r.slug}`, null, r.name) : r.name })) }]
      : []),
    { key: 'status', label: t('users.status'), options: statusOptions },
    ...(kind === 'teacher'
      ? [
          { key: 'verificationStatus', label: t('teachers.verificationStatus'), options: VERIFICATION_STATUSES.map((s) => ({ value: s, label: t(`enums.verification.${s}`) })) },
          { key: 'isPublic', label: t('teachers.isPublic'), options: [{ value: 'true', label: t('common.yes') }, { value: 'false', label: t('common.no') }] },
        ]
      : []),
    {
      key: 'verification',
      label: t('users.verification'),
      options: [
        { value: 'verified', label: t('enums.emailVerification.verified') },
        { value: 'unverified', label: t('enums.emailVerification.unverified') },
      ],
    },
    { key: 'language', label: t('users.language'), options: LANGUAGES.map((l) => ({ value: l, label: t(`enums.language.${l}`) })) },
    { key: 'createdFrom', label: `${t('users.joined')} — ${t('common.from')}`, type: 'date' },
    { key: 'createdTo', label: `${t('users.joined')} — ${t('common.to')}`, type: 'date' },
  ];

  const identity = { key: 'identity', header: t(`${cfg.ns}.${kind}`), sortKey: 'fullName', render: (u) => <Identity user={u} /> };
  const status = { key: 'status', header: t('users.status'), sortKey: kind === 'user' ? 'status' : undefined, render: (u) => <StatusBadge status={u.status} /> };
  const joined = { key: 'createdAt', header: t('users.joined'), sortKey: 'createdAt', render: (u) => <span className="nowrap">{formatDate(u.createdAt)}</span> };
  const actions = { key: 'actions', header: '', className: 'actions-cell', render: (u) => <RowActions account={u} cfg={cfg} /> };

  const columns = {
    user: [
      identity,
      { key: 'roles', header: t('users.roles'), render: (u) => <RoleList roles={u.roles} /> },
      status,
      { key: 'verification', header: t('users.verification'), render: (u) => <EmailVerificationBadge verifiedAt={u.emailVerifiedAt} /> },
      { key: 'language', header: t('users.language'), render: (u) => <Badge>{t(`enums.language.${u.preferredLanguage}`)}</Badge> },
      { key: 'lastLoginAt', header: t('users.lastLogin'), sortKey: 'lastLoginAt', render: (u) => <span className="nowrap muted">{formatRelative(u.lastLoginAt)}</span> },
      joined,
      actions,
    ],
    teacher: [
      identity,
      { key: 'email', header: t('users.email'), render: (u) => <span className="ltr">{u.email}</span> },
      { key: 'phone', header: t('users.phone'), render: (u) => (u.phone ? <span className="ltr">{u.phone}</span> : <span className="subtle">—</span>) },
      { key: 'specialization', header: t('teachers.specialization'), sortKey: 'specialization', render: (u) => u.teacherProfile?.specialization || <span className="subtle">—</span> },
      { key: 'verificationStatus', header: t('teachers.verificationStatus'), sortKey: 'verificationStatus', render: (u) => <VerificationBadge status={u.teacherProfile?.verificationStatus} /> },
      status,
      joined,
      actions,
    ],
    student: [
      identity,
      { key: 'email', header: t('users.email'), render: (u) => <span className="ltr">{u.email}</span> },
      { key: 'phone', header: t('users.phone'), render: (u) => (u.phone ? <span className="ltr">{u.phone}</span> : <span className="subtle">—</span>) },
      { key: 'institution', header: t('students.institution'), sortKey: 'institution', render: (u) => u.studentProfile?.institution || <span className="subtle">—</span> },
      { key: 'gradeLevel', header: t('students.gradeLevel'), sortKey: 'gradeLevel', render: (u) => u.studentProfile?.gradeLevel || <span className="subtle">—</span> },
      status,
      { key: 'verification', header: t('users.verification'), render: (u) => <EmailVerificationBadge verifiedAt={u.emailVerifiedAt} /> },
      joined,
      actions,
    ],
  }[kind];

  return (
    <>
      <PageHeader
        title={t(`${cfg.ns}.title`)}
        subtitle={t(`${cfg.ns}.subtitle`)}
        actions={
          can(cfg.perms.create) && (
            <Button variant="primary" icon={Plus} to={`${cfg.base}/create`}>
              {t(`${cfg.ns}.create`)}
            </Button>
          )
        }
      />
      <Card>
        <FilterBar {...list} filters={filters}>
          {kind === 'user' && (
            <Checkbox label={t('users.includeDeleted')} checked={params.includeDeleted === 'true'} onChange={(e) => setParams({ includeDeleted: e.target.checked ? 'true' : '' })} />
          )}
        </FilterBar>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          query={query}
          filtered={list.activeFilterCount > 0}
          sort={{ sortBy: params.sortBy, sortOrder: params.sortOrder }}
          onSortChange={setParams}
          onRowClick={(u) => navigate(`${cfg.base}/${u.id}`)}
        />
        <Pagination meta={query.data?.meta} onChange={setParams} />
      </Card>
    </>
  );
}
