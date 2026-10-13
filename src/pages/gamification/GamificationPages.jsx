import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  achievementsApi,
  experienceLevelsApi,
  gamificationRulesApi,
  leaderboardsApi,
  pointsLedgerApi,
  starMilestonesApi,
  xpLedgerApi,
} from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DescriptionList,
  EnumBadge,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  QueryState,
  Select,
  TextInput,
  Textarea,
  ViewButton,
} from '@/components/ui';

const RULE_TYPES = [
  'LESSONS_COMPLETED',
  'QUIZZES_PASSED',
  'COURSES_COMPLETED',
  'STREAK_DAYS',
  'TOTAL_POINTS',
  'TOTAL_XP',
  'QUIZ_SCORE_COUNT',
  'MANUAL',
];

export function AchievementsPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.achievements(list.params), queryFn: () => achievementsApi.list(list.params) });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const detail = useQuery({
    queryKey: ['achievement', detailId],
    queryFn: () => achievementsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const form = useForm({
    defaultValues: {
      code: '',
      titleAr: '',
      titleEn: '',
      ruleType: 'LESSONS_COMPLETED',
      ruleConfig: '{"count":1}',
      rewardPoints: 10,
      rewardXp: 5,
    },
  });

  const create = useApiMutation(
    (body) => achievementsApi.create({
      ...body,
      rewardPoints: Number(body.rewardPoints),
      rewardXp: Number(body.rewardXp),
      ruleConfig: JSON.parse(body.ruleConfig || '{}'),
    }),
    { invalidate: [['achievements']], onSuccess: () => { setCreateOpen(false); form.reset(); } },
  );
  const update = useApiMutation(
    ({ id, body }) => achievementsApi.update(id, {
      ...body,
      rewardPoints: body.rewardPoints != null ? Number(body.rewardPoints) : undefined,
      rewardXp: body.rewardXp != null ? Number(body.rewardXp) : undefined,
      ruleConfig: body.ruleConfig ? JSON.parse(body.ruleConfig) : undefined,
    }),
    {
      invalidate: [['achievements'], ['achievement', detailId]],
      onSuccess: () => setEditRow(null),
    },
  );
  const remove = useApiMutation((id) => achievementsApi.remove(id), {
    invalidate: [['achievements']],
    onSuccess: () => setDetailId(null),
  });

  const columns = useMemo(
    () => [
      { key: 'code', header: t('phase3.code'), render: (r) => <span className="ltr">{r.code}</span> },
      {
        key: 'title',
        header: t('phase3.title'),
        render: (r) => (locale === 'ar' ? r.titleAr : r.titleEn) || r.titleAr,
      },
      {
        key: 'rule',
        header: t('phase3.ruleType'),
        render: (r) => t(`enums.unlockRuleType.${r.ruleType || r.unlockRuleType}`, null, r.ruleType || r.unlockRuleType),
      },
      { key: 'status', header: t('education.status'), render: (r) => <EnumBadge value={r.status} ns="achievementStatus" /> },
      { key: 'reward', header: t('phase3.reward'), render: (r) => `${r.rewardPoints}p / ${r.rewardXp}xp` },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {can(P.ACHIEVEMENTS_UPDATE) && (
              <Button
                size="sm"
                variant="ghost"
                icon={Pencil}
                aria-label={t('common.edit')}
                onClick={() => {
                  setEditRow(r);
                  form.reset({
                    code: r.code,
                    titleAr: r.titleAr,
                    titleEn: r.titleEn,
                    ruleType: r.ruleType || r.unlockRuleType || 'LESSONS_COMPLETED',
                    ruleConfig: JSON.stringify(r.ruleConfig || r.unlockRuleConfig || { count: 1 }),
                    rewardPoints: r.rewardPoints,
                    rewardXp: r.rewardXp,
                  });
                }}
              />
            )}
          </div>
        ),
      },
    ],
    [t, locale, can, form],
  );

  return (
    <>
      <PageHeader
        title={t('phase3.achievementsTitle')}
        actions={can(P.ACHIEVEMENTS_CREATE) && (
          <Button icon={Plus} variant="primary" onClick={() => { form.reset(); setCreateOpen(true); }}>
            {t('common.create')}
          </Button>
        )}
      />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase3.achievementDetail')}>
        <QueryState query={detail}>
          {(a) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase3.code'), value: <span className="ltr">{a.code}</span> },
                  { label: t('education.nameAr'), value: a.titleAr },
                  { label: t('education.nameEn'), value: a.titleEn },
                  {
                    label: t('phase3.ruleType'),
                    value: t(`enums.unlockRuleType.${a.ruleType || a.unlockRuleType}`, null, a.ruleType || a.unlockRuleType),
                  },
                  {
                    label: t('phase3.ruleConfig'),
                    value: <span className="ltr">{JSON.stringify(a.ruleConfig || a.unlockRuleConfig || {})}</span>,
                  },
                  { label: t('phase3.reward'), value: `${a.rewardPoints}p / ${a.rewardXp}xp` },
                  { label: t('education.status'), value: <EnumBadge value={a.status} ns="achievementStatus" /> },
                ]}
              />
              {can(P.ACHIEVEMENTS_DELETE) && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="danger" icon={Trash2} loading={remove.isPending} onClick={() => remove.mutate(a.id)}>
                    {t('common.delete')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>

      <Modal
        open={createOpen || Boolean(editRow)}
        onClose={() => { setCreateOpen(false); setEditRow(null); }}
        title={editRow ? t('common.edit') : t('common.create')}
      >
        <form
          className="stack-md"
          onSubmit={form.handleSubmit((v) => {
            if (editRow) update.mutate({ id: editRow.id, body: v });
            else create.mutate(v);
          })}
        >
          {!editRow && (
            <FormField label={t('phase3.code')}>
              <TextInput className="ltr" {...form.register('code', { required: true })} />
            </FormField>
          )}
          <FormField label={t('education.nameAr')}><TextInput {...form.register('titleAr', { required: true })} /></FormField>
          <FormField label={t('education.nameEn')}><TextInput {...form.register('titleEn', { required: true })} /></FormField>
          <FormField label={t('phase3.ruleType')}>
            <Select {...form.register('ruleType')}>
              {RULE_TYPES.map((v) => (
                <option key={v} value={v}>{t(`enums.unlockRuleType.${v}`, null, v)}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('phase3.ruleConfig')}>
            <Textarea className="ltr" rows={3} {...form.register('ruleConfig')} />
          </FormField>
          <div className="row" style={{ gap: 12 }}>
            <FormField className="grow" label={t('phase3.rewardPoints')}>
              <TextInput type="number" {...form.register('rewardPoints')} />
            </FormField>
            <FormField className="grow" label={t('phase3.rewardXp')}>
              <TextInput type="number" {...form.register('rewardXp')} />
            </FormField>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => { setCreateOpen(false); setEditRow(null); }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function StarsPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const query = useQuery({ queryKey: queryKeys.stars, queryFn: () => starMilestonesApi.list().then((r) => r.data) });
  const [detail, setDetail] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const form = useForm({
    defaultValues: { titleAr: '', titleEn: '', unlockRuleType: 'LESSONS_COMPLETED', rewardPoints: 0, rewardXp: 0 },
  });
  const update = useApiMutation(
    ({ id, body }) => starMilestonesApi.update(id, {
      ...body,
      rewardPoints: Number(body.rewardPoints),
      rewardXp: Number(body.rewardXp),
    }),
    {
      invalidate: [['stars']],
      onSuccess: () => { setEditOpen(false); setDetail(null); },
    },
  );

  const columns = useMemo(
    () => [
      {
        key: 'star',
        header: t('phase3.star'),
        render: (r) => (
          <span style={{ fontWeight: 800, color: 'var(--gold)' }}>
            ★ {r.starNumber}
          </span>
        ),
      },
      {
        key: 'title',
        header: t('phase3.title'),
        render: (r) => (locale === 'ar' ? r.titleAr : r.titleEn) || r.titleAr,
      },
      {
        key: 'rule',
        header: t('phase3.ruleType'),
        render: (r) => t(`enums.unlockRuleType.${r.unlockRuleType}`, null, r.unlockRuleType),
      },
      { key: 'reward', header: t('phase3.reward'), render: (r) => `${r.rewardPoints}p / ${r.rewardXp}xp` },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetail(r)} />
            {can(P.STARS_MANAGE) && (
              <Button
                size="sm"
                variant="ghost"
                icon={Pencil}
                aria-label={t('common.edit')}
                onClick={() => {
                  setDetail(r);
                  form.reset({
                    titleAr: r.titleAr,
                    titleEn: r.titleEn,
                    unlockRuleType: r.unlockRuleType,
                    rewardPoints: r.rewardPoints,
                    rewardXp: r.rewardXp,
                  });
                  setEditOpen(true);
                }}
              />
            )}
          </div>
        ),
      },
    ],
    [t, locale, can, form],
  );

  return (
    <>
      <PageHeader title={t('phase3.starsTitle')} subtitle={t('phase3.starsSubtitle')} />
      <Card>
        <DataTable columns={columns} rows={query.data} query={query} onRowClick={(r) => setDetail(r)} />
      </Card>
      <Modal open={Boolean(detail) && !editOpen} onClose={() => setDetail(null)} title={t('phase3.starDetail')}>
        {detail && (
          <DescriptionList
            items={[
              { label: t('phase3.star'), value: `★ ${detail.starNumber}` },
              { label: t('education.nameAr'), value: detail.titleAr },
              { label: t('education.nameEn'), value: detail.titleEn },
              {
                label: t('phase3.ruleType'),
                value: t(`enums.unlockRuleType.${detail.unlockRuleType}`, null, detail.unlockRuleType),
              },
              {
                label: t('phase3.ruleConfig'),
                value: <span className="ltr">{JSON.stringify(detail.unlockRuleConfig || {})}</span>,
              },
              { label: t('phase3.reward'), value: `${detail.rewardPoints}p / ${detail.rewardXp}xp` },
            ]}
          />
        )}
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('common.edit')}>
        <form
          className="stack-md"
          onSubmit={form.handleSubmit((v) => detail && update.mutate({ id: detail.id, body: v }))}
        >
          <FormField label={t('education.nameAr')}><TextInput {...form.register('titleAr')} /></FormField>
          <FormField label={t('education.nameEn')}><TextInput {...form.register('titleEn')} /></FormField>
          <FormField label={t('phase3.ruleType')}>
            <Select {...form.register('unlockRuleType')}>
              {RULE_TYPES.map((v) => (
                <option key={v} value={v}>{t(`enums.unlockRuleType.${v}`, null, v)}</option>
              ))}
            </Select>
          </FormField>
          <div className="row" style={{ gap: 12 }}>
            <FormField className="grow" label={t('phase3.rewardPoints')}>
              <TextInput type="number" {...form.register('rewardPoints')} />
            </FormField>
            <FormField className="grow" label={t('phase3.rewardXp')}>
              <TextInput type="number" {...form.register('rewardXp')} />
            </FormField>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={update.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function LevelsPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const query = useQuery({ queryKey: queryKeys.levels, queryFn: () => experienceLevelsApi.list().then((r) => r.data) });
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const form = useForm({ defaultValues: { levelNumber: 1, nameAr: '', nameEn: '', minXp: 0, maxXp: 99 } });
  const create = useApiMutation((body) => experienceLevelsApi.create(body), {
    invalidate: [['levels']],
    onSuccess: () => { setOpen(false); form.reset(); },
  });
  const update = useApiMutation(
    ({ id, body }) => experienceLevelsApi.update(id, body),
    { invalidate: [['levels']], onSuccess: () => setEditRow(null) },
  );
  const remove = useApiMutation((id) => experienceLevelsApi.remove(id), { invalidate: [['levels']] });

  const columns = useMemo(
    () => [
      { key: 'n', header: '#', render: (r) => r.levelNumber },
      {
        key: 'name',
        header: t('phase3.title'),
        render: (r) => (locale === 'ar' ? r.nameAr : r.nameEn) || r.nameAr,
      },
      {
        key: 'xp',
        header: 'XP',
        render: (r) => (
          <span className="ltr" style={{ fontWeight: 700 }}>
            {r.minXp}{r.maxXp != null ? `–${r.maxXp}` : '+'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetail(r)} />
            {can(P.LEVELS_MANAGE) && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Pencil}
                  aria-label={t('common.edit')}
                  onClick={() => {
                    setEditRow(r);
                    form.reset({
                      levelNumber: r.levelNumber,
                      nameAr: r.nameAr,
                      nameEn: r.nameEn,
                      minXp: r.minXp,
                      maxXp: r.maxXp ?? '',
                    });
                  }}
                />
                <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('common.delete')} onClick={() => remove.mutate(r.id)} />
              </>
            )}
          </div>
        ),
      },
    ],
    [t, locale, can, form, remove],
  );

  return (
    <>
      <PageHeader
        title={t('phase3.levelsTitle')}
        actions={can(P.LEVELS_MANAGE) && (
          <Button icon={Plus} variant="primary" onClick={() => { form.reset({ levelNumber: 1, nameAr: '', nameEn: '', minXp: 0, maxXp: 99 }); setOpen(true); }}>
            {t('common.create')}
          </Button>
        )}
      />
      <Card>
        <DataTable columns={columns} rows={query.data} query={query} onRowClick={(r) => setDetail(r)} />
      </Card>
      <Modal open={Boolean(detail) && !editRow} onClose={() => setDetail(null)} title={t('phase3.levelDetail')}>
        {detail && (
          <DescriptionList
            items={[
              { label: '#', value: detail.levelNumber },
              { label: t('education.nameAr'), value: detail.nameAr },
              { label: t('education.nameEn'), value: detail.nameEn },
              { label: 'XP', value: `${detail.minXp}${detail.maxXp != null ? `–${detail.maxXp}` : '+'}` },
            ]}
          />
        )}
      </Modal>
      <Modal open={open || Boolean(editRow)} onClose={() => { setOpen(false); setEditRow(null); }} title={editRow ? t('common.edit') : t('common.create')}>
        <form
          className="stack-md"
          onSubmit={form.handleSubmit((v) => {
            const body = {
              ...v,
              levelNumber: Number(v.levelNumber),
              minXp: Number(v.minXp),
              maxXp: v.maxXp === '' || v.maxXp == null ? null : Number(v.maxXp),
            };
            if (editRow) update.mutate({ id: editRow.id, body });
            else create.mutate(body);
          })}
        >
          {!editRow && <FormField label="#"><TextInput type="number" {...form.register('levelNumber')} /></FormField>}
          <FormField label={t('education.nameAr')}><TextInput {...form.register('nameAr')} /></FormField>
          <FormField label={t('education.nameEn')}><TextInput {...form.register('nameEn')} /></FormField>
          <FormField label="minXp"><TextInput type="number" {...form.register('minXp')} /></FormField>
          <FormField label="maxXp"><TextInput type="number" {...form.register('maxXp')} /></FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setEditRow(null); }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function RulesPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const query = useQuery({ queryKey: queryKeys.gamificationRules, queryFn: () => gamificationRulesApi.list().then((r) => r.data) });
  const update = useApiMutation(({ id, body }) => gamificationRulesApi.update(id, body), { invalidate: [['gamification-rules']] });
  return (
    <>
      <PageHeader title={t('phase3.rulesTitle')} />
      <div className="stack-md">
        {(query.data || []).map((r) => (
          <Card key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.nameAr}</div>
                <div className="field__hint ltr">{r.key}</div>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <Badge tone={r.enabled ? 'success' : 'muted'}>
                  {r.enabled ? t('common.enabled') : t('common.disabled')}
                </Badge>
                {can(P.GAMIFICATION_MANAGE) && (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, body: { enabled: !r.enabled } })}>
                    {r.enabled ? t('education.actions.deactivate') : t('education.actions.activate')}
                  </Button>
                )}
              </div>
            </div>
            <div className="field__hint" style={{ marginTop: 8 }}>{r.points}p / {r.xp}xp</div>
          </Card>
        ))}
      </div>
    </>
  );
}

function LedgerPage({ kind }) {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const api = kind === 'points' ? pointsLedgerApi : xpLedgerApi;
  const key = kind === 'points' ? queryKeys.pointsLedger : queryKeys.xpLedger;
  const permAdjust = kind === 'points' ? P.POINTS_ADJUST : P.XP_ADJUST;
  const query = useQuery({ queryKey: key(list.params), queryFn: () => api.list(list.params) });
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const form = useForm({ defaultValues: { userId: '', amount: 10, reasonKey: 'admin.adjustment' } });
  const adjust = useApiMutation((body) => api.adjust({ ...body, amount: Number(body.amount) }), {
    invalidate: [kind === 'points' ? ['points-ledger'] : ['xp-ledger']],
    onSuccess: () => { setOpen(false); form.reset(); },
  });
  return (
    <>
      <PageHeader
        title={kind === 'points' ? t('phase3.pointsTitle') : t('phase3.xpTitle')}
        actions={can(permAdjust) && <Button variant="primary" onClick={() => setOpen(true)}>{t('phase3.adjust')}</Button>}
      />
      <Card>
        <DataTable
          columns={[
            { key: 'user', header: t('education.student'), render: (r) => r.user?.fullName || r.userId },
            { key: 'amount', header: t('phase3.amount'), render: (r) => <span className="ltr" style={{ fontWeight: 700 }}>{r.amount}</span> },
            { key: 'source', header: t('education.source'), render: (r) => <span className="ltr">{r.sourceType}</span> },
            { key: 'createdAt', header: t('education.updatedAt'), render: (r) => formatDateTime(r.createdAt) },
            {
              key: 'actions',
              header: '',
              className: 'actions-cell',
              render: (r) => <ViewButton onClick={() => setDetail(r)} />,
            },
          ]}
          rows={query.data?.data}
          query={query}
          onRowClick={(r) => setDetail(r)}
        />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={t('phase3.ledgerDetail')}>
        {detail && (
          <DescriptionList
            items={[
              { label: t('education.student'), value: detail.user?.fullName || detail.userId },
              { label: t('phase3.amount'), value: detail.amount },
              { label: t('education.source'), value: <span className="ltr">{detail.sourceType}</span> },
              { label: t('phase3.reason'), value: detail.reasonKey || '—' },
              { label: t('phase4.createdAt'), value: detail.createdAt ? formatDateTime(detail.createdAt) : '—' },
            ]}
          />
        )}
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title={t('phase3.adjust')}>
        <form className="stack-md" onSubmit={form.handleSubmit((v) => adjust.mutate(v))}>
          <FormField label="userId"><TextInput className="ltr" {...form.register('userId')} /></FormField>
          <FormField label={t('phase3.amount')}><TextInput type="number" {...form.register('amount')} /></FormField>
          <FormField label="reasonKey"><TextInput className="ltr" {...form.register('reasonKey')} /></FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={adjust.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PointsLedgerPage() {
  return <LedgerPage kind="points" />;
}
export function XpLedgerPage() {
  return <LedgerPage kind="xp" />;
}

export function LeaderboardsPage() {
  const { t } = useI18n();
  const allTime = useQuery({ queryKey: [...queryKeys.leaderboards, 'all'], queryFn: () => leaderboardsApi.allTime().then((r) => r.data) });
  const weekly = useQuery({ queryKey: [...queryKeys.leaderboards, 'week'], queryFn: () => leaderboardsApi.weekly().then((r) => r.data) });
  return (
    <>
      <PageHeader title={t('phase3.leaderboardsTitle')} />
      <div className="stack-lg">
        <Card>
          <h3 className="card__title" style={{ padding: '16px 22px 0' }}>{t('phase3.allTime')}</h3>
          <DataTable
            columns={[
              { key: 'rank', header: '#', render: (r) => <Badge tone="gold">{r.rank}</Badge> },
              { key: 'name', header: t('education.student'), render: (r) => r.displayName },
              { key: 'points', header: t('phase3.points'), render: (r) => <span style={{ fontWeight: 700 }}>{r.points}</span> },
            ]}
            rows={allTime.data}
            query={allTime}
            rowKey="studentId"
          />
        </Card>
        <Card>
          <h3 className="card__title" style={{ padding: '16px 22px 0' }}>{t('phase3.weekly')}</h3>
          <DataTable
            columns={[
              { key: 'rank', header: '#', render: (r) => <Badge tone="gold">{r.rank}</Badge> },
              { key: 'name', header: t('education.student'), render: (r) => r.displayName },
              { key: 'points', header: t('phase3.points'), render: (r) => <span style={{ fontWeight: 700 }}>{r.points}</span> },
            ]}
            rows={weekly.data}
            query={weekly}
            rowKey="studentId"
          />
        </Card>
      </div>
    </>
  );
}
