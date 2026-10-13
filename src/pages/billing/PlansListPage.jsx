import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Eye, Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { plansApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import { Badge, Button, Card, DataTable, FilterBar, FormField, Modal, PageHeader, Pagination, Select, TextInput, Textarea } from '@/components/ui';
import { formatMoney, pickPlanName, priceByInterval, STATUS_TONE } from './billingUtils';

export default function PlansListPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const list = useListParams({ sortBy: 'sortOrder', sortOrder: 'asc' });
  const query = useQuery({ queryKey: queryKeys.plans(list.params), queryFn: () => plansApi.list(list.params) });
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      targetRole: 'TEACHER',
      isFeatured: false,
      sortOrder: 10,
      trialDays: 0,
      isDefaultFree: false,
    },
  });
  const create = useApiMutation((body) => plansApi.create({
    ...body,
    sortOrder: Number(body.sortOrder) || 0,
    trialDays: Number(body.trialDays) || 0,
    isFeatured: Boolean(body.isFeatured),
    isDefaultFree: Boolean(body.isDefaultFree),
  }), {
    invalidate: [['plans']],
    onSuccess: (res) => {
      setOpen(false);
      form.reset();
      if (res?.data?.id) navigate(`/plans/${res.data.id}`);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('phase4.plan'),
        render: (r) => (
          <div>
            <div style={{ fontWeight: 700 }}>{pickPlanName(r, locale)}</div>
            <div className="field__hint ltr">{r.code}</div>
          </div>
        ),
      },
      { key: 'role', header: t('phase4.targetRole'), render: (r) => t(`phase4.roles.${r.targetRole}`, null, r.targetRole) },
      {
        key: 'status',
        header: t('education.status'),
        render: (r) => <Badge tone={STATUS_TONE[r.status] || 'muted'}>{t(`phase4.planStatus.${r.status}`, null, r.status)}</Badge>,
      },
      { key: 'featured', header: t('phase4.featured'), render: (r) => (r.isFeatured ? t('common.yes') : t('common.no')) },
      {
        key: 'monthly',
        header: t('phase4.monthly'),
        render: (r) => {
          const p = priceByInterval(r.prices, 'MONTHLY');
          return p ? formatMoney(p.amountMinor, p.currency, locale) : '—';
        },
      },
      {
        key: 'yearly',
        header: t('phase4.yearly'),
        render: (r) => {
          const p = priceByInterval(r.prices, 'YEARLY');
          return p ? formatMoney(p.amountMinor, p.currency, locale) : '—';
        },
      },
      {
        key: 'subs',
        header: t('phase4.activeSubscribers'),
        render: (r) => r.activeSubscriptionCount ?? r._count?.subscriptions ?? r.subscriptionCount ?? 0,
      },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => <Button size="sm" variant="ghost" icon={Eye} to={`/plans/${r.id}`} aria-label={t('common.view')} onClick={(e) => e.stopPropagation()} />,
      },
    ],
    [t, locale],
  );

  return (
    <>
      <PageHeader
        title={t('phase4.plansTitle')}
        subtitle={t('phase4.plansSubtitle')}
        actions={can(P.PLANS_CREATE) && <Button icon={Plus} variant="primary" onClick={() => setOpen(true)}>{t('common.create')}</Button>}
      />
      <Card>
        <FilterBar
          {...list}
          filters={[
            {
              key: 'status',
              label: t('education.status'),
              options: ['ACTIVE', 'INACTIVE', 'ARCHIVED'].map((v) => ({ value: v, label: t(`phase4.planStatus.${v}`, null, v) })),
            },
            {
              key: 'targetRole',
              label: t('phase4.targetRole'),
              options: ['TEACHER', 'STUDENT', 'BOTH'].map((v) => ({ value: v, label: t(`phase4.roles.${v}`, null, v) })),
            },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} sort={list.params} onSortChange={list.setParams} onRowClick={(r) => navigate(`/plans/${r.id}`)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={t('phase4.createPlan')}>
        <form className="stack-md" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <FormField label={t('phase4.code')}><TextInput className="ltr" {...form.register('code', { required: true })} /></FormField>
          <FormField label={t('education.nameAr')}><TextInput {...form.register('nameAr', { required: true })} /></FormField>
          <FormField label={t('education.nameEn')}><TextInput {...form.register('nameEn', { required: true })} /></FormField>
          <FormField label={t('phase4.descriptionAr')}><Textarea rows={2} {...form.register('descriptionAr')} /></FormField>
          <FormField label={t('phase4.descriptionEn')}><Textarea rows={2} {...form.register('descriptionEn')} /></FormField>
          <FormField label={t('phase4.targetRole')}>
            <Select {...form.register('targetRole')}>
              {['TEACHER', 'STUDENT', 'BOTH'].map((v) => <option key={v} value={v}>{t(`phase4.roles.${v}`, null, v)}</option>)}
            </Select>
          </FormField>
          <FormField label={t('phase4.sortOrder')}><TextInput type="number" {...form.register('sortOrder')} /></FormField>
          <FormField label={t('phase4.trialDays')}><TextInput type="number" {...form.register('trialDays')} /></FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={create.isPending}>{t('common.create')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
