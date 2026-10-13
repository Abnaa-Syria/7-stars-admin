import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { planPricesApi, plansApi, subscriptionsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useListParams } from '@/hooks/useListParams';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DescriptionList,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  QueryState,
  Select,
  Tabs,
  TextInput,
} from '@/components/ui';
import { ENTITLEMENT_DEFS, STATUS_TONE, formatMoney, pickPlanName } from './billingUtils';

function EntitlementsEditor({ planId, entitlements, canEdit }) {
  const { t } = useI18n();
  const byKey = Object.fromEntries((entitlements || []).map((e) => [e.key, e]));
  const [values, setValues] = useState(() => {
    const init = {};
    for (const def of ENTITLEMENT_DEFS) {
      const existing = byKey[def.key];
      init[def.key] = existing?.value ?? (def.valueType === 'BOOLEAN' ? false : '');
    }
    return init;
  });

  useEffect(() => {
    const next = {};
    for (const def of ENTITLEMENT_DEFS) {
      const existing = byKey[def.key];
      next[def.key] = existing?.value ?? (def.valueType === 'BOOLEAN' ? false : '');
    }
    setValues(next);
  }, [entitlements]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useApiMutation(
    () => {
      const payload = ENTITLEMENT_DEFS.map((def) => {
        let value = values[def.key];
        if (def.valueType === 'INTEGER') value = value === '' || value == null ? null : Number(value);
        if (def.valueType === 'BOOLEAN') value = Boolean(value);
        return { key: def.key, valueType: def.valueType, value };
      }).filter((e) => e.value !== null && e.value !== '');
      return plansApi.replaceEntitlements(planId, payload);
    },
    { invalidate: [['plan', planId], ['plan', planId, 'entitlements']] },
  );

  return (
    <Card>
      <div className="stack-md">
        {ENTITLEMENT_DEFS.map((def) => (
          <FormField key={def.key} label={t(def.labelKey)}>
            {def.valueType === 'BOOLEAN' ? (
              <Select
                value={values[def.key] ? 'true' : 'false'}
                onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value === 'true' }))}
                disabled={!canEdit}
              >
                <option value="true">{t('common.yes')}</option>
                <option value="false">{t('common.no')}</option>
              </Select>
            ) : (
              <TextInput
                type="number"
                className="ltr"
                value={values[def.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value }))}
                disabled={!canEdit}
              />
            )}
            <div className="field__hint ltr">{def.key}</div>
          </FormField>
        ))}
        {canEdit && (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const { t, locale, formatDateTime } = useI18n();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const query = useQuery({ queryKey: queryKeys.plan(id), queryFn: () => plansApi.get(id).then((r) => r.data), enabled: Boolean(id) });
  const pricesQuery = useQuery({
    queryKey: queryKeys.planPrices(id),
    queryFn: () => planPricesApi.list(id).then((r) => r.data),
    enabled: Boolean(id) && tab === 'prices',
  });
  const entitlementsQuery = useQuery({
    queryKey: queryKeys.planEntitlements(id),
    queryFn: () => plansApi.entitlements(id).then((r) => r.data),
    enabled: Boolean(id) && tab === 'entitlements',
  });
  const subsList = useListParams({ planId: id });
  const subscribers = useQuery({
    queryKey: queryKeys.subscriptions({ ...subsList.params, planId: id }),
    queryFn: () => subscriptionsApi.list({ ...subsList.params, planId: id }),
    enabled: Boolean(id) && tab === 'subscribers',
  });

  const invalidate = [['plans'], ['plan', id], ['audit-logs']];
  const activate = useApiMutation(() => plansApi.activate(id), { invalidate });
  const deactivate = useApiMutation(() => plansApi.deactivate(id), { invalidate });
  const archive = useApiMutation(() => plansApi.archive(id), { invalidate });

  const [priceOpen, setPriceOpen] = useState(false);
  const priceForm = useForm({
    defaultValues: { billingInterval: 'MONTHLY', currency: 'SAR', amountMinor: 0 },
  });
  const createPrice = useApiMutation(
    (body) => planPricesApi.create(id, { ...body, amountMinor: Number(body.amountMinor) }),
    {
      invalidate: [['plan', id], ['plan', id, 'prices'], ['plans']],
      onSuccess: () => { setPriceOpen(false); priceForm.reset(); },
    },
  );
  const togglePrice = useApiMutation(
    ({ priceId, active }) => (active ? planPricesApi.deactivate(priceId) : planPricesApi.activate(priceId)),
    { invalidate: [['plan', id], ['plan', id, 'prices'], ['plans']] },
  );

  const tabs = [
    { id: 'overview', label: t('education.tabs.overview') },
    { id: 'prices', label: t('phase4.prices') },
    { id: 'entitlements', label: t('phase4.entitlements') },
    { id: 'subscribers', label: t('phase4.subscribers') },
  ];

  const plan = query.data;
  const title = pickPlanName(plan, locale);

  return (
    <div className="stack-lg">
      <PageHeader
        title={title || t('phase4.plansTitle')}
        breadcrumbs={[{ label: t('phase4.plansTitle'), to: '/plans' }, { label: title || t('common.details') }]}
        actions={
          plan && (
            <div className="row wrap">
              {can(P.PLANS_UPDATE) && plan.status !== 'ACTIVE' && (
                <Button size="sm" variant="outline" loading={activate.isPending} onClick={() => activate.mutate()}>{t('phase4.activate')}</Button>
              )}
              {can(P.PLANS_UPDATE) && plan.status === 'ACTIVE' && (
                <Button size="sm" variant="outline" loading={deactivate.isPending} onClick={() => deactivate.mutate()}>{t('phase4.deactivate')}</Button>
              )}
              {can(P.PLANS_ARCHIVE) && plan.status !== 'ARCHIVED' && (
                <Button size="sm" variant="danger" loading={archive.isPending} onClick={() => archive.mutate()}>{t('phase4.archive')}</Button>
              )}
            </div>
          )
        }
      />
      <QueryState query={query}>
        {(data) => (
          <>
            <Badge tone={STATUS_TONE[data.status] || 'muted'}>{t(`phase4.planStatus.${data.status}`, null, data.status)}</Badge>
            <Tabs tabs={tabs} active={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />

            {tab === 'overview' && (
              <Card>
                <DescriptionList
                  items={[
                    { label: t('phase4.code'), value: <span className="ltr">{data.code}</span> },
                    { label: t('education.nameAr'), value: data.nameAr },
                    { label: t('education.nameEn'), value: data.nameEn },
                    { label: t('phase4.targetRole'), value: t(`phase4.roles.${data.targetRole}`, null, data.targetRole) },
                    { label: t('phase4.featured'), value: data.isFeatured ? t('common.yes') : t('common.no') },
                    { label: t('phase4.trialDays'), value: data.trialDays ?? 0 },
                    { label: t('phase4.sortOrder'), value: data.sortOrder },
                    { label: t('phase4.defaultFree'), value: data.isDefaultFree ? t('common.yes') : t('common.no') },
                    { label: t('phase4.descriptionAr'), value: data.descriptionAr || '—' },
                    { label: t('phase4.descriptionEn'), value: data.descriptionEn || '—' },
                    { label: t('education.updatedAt'), value: formatDateTime(data.updatedAt) },
                  ]}
                />
              </Card>
            )}

            {tab === 'prices' && (
              <>
                <PageHeader
                  title={t('phase4.prices')}
                  actions={can(P.PLANS_UPDATE) && (
                    <Button icon={Plus} size="sm" variant="primary" onClick={() => setPriceOpen(true)}>{t('phase4.addPrice')}</Button>
                  )}
                />
                <Card>
                  <DataTable
                    columns={[
                      { key: 'interval', header: t('phase4.interval'), render: (r) => t(`phase4.intervals.${r.billingInterval}`, null, r.billingInterval) },
                      { key: 'amount', header: t('phase4.amount'), render: (r) => formatMoney(r.amountMinor, r.currency, locale) },
                      { key: 'currency', header: t('phase4.currency'), render: (r) => <span className="ltr">{r.currency}</span> },
                      {
                        key: 'status',
                        header: t('education.status'),
                        render: (r) => (
                          <Badge tone={STATUS_TONE[r.status] || 'muted'}>
                            {t(`enums.planStatus.${r.status}`, null, r.status)}
                          </Badge>
                        ),
                      },
                      {
                        key: 'actions',
                        header: '',
                        className: 'actions-cell',
                        render: (r) => can(P.PLANS_UPDATE) && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={togglePrice.isPending}
                            onClick={(e) => { e.stopPropagation(); togglePrice.mutate({ priceId: r.id, active: r.status === 'ACTIVE' }); }}
                          >
                            {r.status === 'ACTIVE' ? t('phase4.deactivate') : t('phase4.activate')}
                          </Button>
                        ),
                      },
                    ]}
                    rows={pricesQuery.data || data.prices}
                    query={pricesQuery.isFetching ? pricesQuery : query}
                  />
                </Card>
              </>
            )}

            {tab === 'entitlements' && (
              <EntitlementsEditor
                planId={id}
                entitlements={entitlementsQuery.data || data.entitlements}
                canEdit={can(P.PLANS_UPDATE)}
              />
            )}

            {tab === 'subscribers' && (
              <Card>
                <DataTable
                  columns={[
                    { key: 'user', header: t('phase4.user'), render: (r) => r.user?.fullName || r.userId },
                    { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.subStatus.${r.status}`, null, r.status)}</Badge> },
                    { key: 'interval', header: t('phase4.interval'), render: (r) => (r.price?.billingInterval ? t(`phase4.intervals.${r.price.billingInterval}`, null, r.price.billingInterval) : '—') },
                    { key: 'period', header: t('phase4.periodEnd'), render: (r) => (r.currentPeriodEnd ? formatDateTime(r.currentPeriodEnd) : '—') },
                  ]}
                  rows={subscribers.data?.data}
                  query={subscribers}
                />
                <Pagination meta={subscribers.data?.meta} onChange={subsList.setParams} />
              </Card>
            )}
          </>
        )}
      </QueryState>

      <Modal open={priceOpen} onClose={() => setPriceOpen(false)} title={t('phase4.addPrice')}>
        <form className="stack-md" onSubmit={priceForm.handleSubmit((v) => createPrice.mutate(v))}>
          <FormField label={t('phase4.interval')}>
            <Select {...priceForm.register('billingInterval')}>
              {['MONTHLY', 'YEARLY', 'ONE_TIME'].map((v) => <option key={v} value={v}>{t(`phase4.intervals.${v}`, null, v)}</option>)}
            </Select>
          </FormField>
          <FormField label={t('phase4.currency')}><TextInput className="ltr" {...priceForm.register('currency', { required: true })} /></FormField>
          <FormField label={t('phase4.amountMinor')} hint={t('phase4.amountMinorHint')}>
            <TextInput type="number" className="ltr" {...priceForm.register('amountMinor', { required: true })} />
          </FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setPriceOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={createPrice.isPending}>{t('common.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
