import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  billingDashboardApi,
  couponsApi,
  invoicesApi,
  paymentsApi,
  refundsApi,
  subscriptionsApi,
  supportNotesApi,
  webhooksApi,
} from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  DescriptionList,
  EnumBadge,
  FilterBar,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  QueryState,
  Select,
  StatCard,
  TextInput,
  Textarea,
  ViewButton,
} from '@/components/ui';
import { STATUS_TONE, formatMoney, pickPlanName } from './billingUtils';

const SUB_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED', 'INCOMPLETE', 'SUSPENDED'];
const PAY_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const INV_STATUSES = ['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE', 'REFUNDED'];

export function BillingDashboardPage() {
  const { t, locale, formatNumber } = useI18n();
  const query = useQuery({
    queryKey: queryKeys.billingDashboard,
    queryFn: () => billingDashboardApi.get().then((r) => r.data),
  });
  const d = query.data || {};

  return (
    <>
      <PageHeader title={t('phase4.billingDashboardTitle')} subtitle={t('phase4.billingDashboardSubtitle')} />
      <QueryState query={query}>
        {() => (
          <div className="stack-lg">
            <div className="stat-grid">
              <StatCard label={t('phase4.metrics.active')} value={formatNumber(d.activeSubscriptions ?? 0)} />
              <StatCard label={t('phase4.metrics.pastDue')} value={formatNumber(d.pastDueSubscriptions ?? 0)} tone="warning" />
              <StatCard label={t('phase4.metrics.grace')} value={formatNumber(d.gracePeriodSubscriptions ?? 0)} tone="warning" />
              <StatCard label={t('phase4.metrics.canceledMonth')} value={formatNumber(d.canceledThisMonth ?? 0)} />
              <StatCard label={t('phase4.metrics.successfulPayments')} value={formatNumber(d.successfulPaymentsThisMonth ?? 0)} tone="success" />
              <StatCard label={t('phase4.metrics.failedPayments')} value={formatNumber(d.failedPaymentsThisMonth ?? 0)} tone="danger" />
              <StatCard label={t('phase4.metrics.pendingPayments')} value={formatNumber(d.pendingPayments ?? 0)} />
              <StatCard
                label={t('phase4.metrics.revenueMonth')}
                value={formatMoney(d.mrrEstimateMinor ?? 0, d.currency || 'SAR', locale)}
                hint={t('phase4.metrics.revenueHint')}
              />
            </div>
            <Card>
              <h3 style={{ marginTop: 0 }}>{t('phase4.metrics.planDistribution')}</h3>
              <DataTable
                columns={[
                  { key: 'plan', header: t('phase4.plan'), render: (r) => pickPlanName(r.plan, locale) || r.planId },
                  { key: 'count', header: t('phase4.subscribers'), render: (r) => formatNumber(r.count ?? 0) },
                ]}
                rows={d.subscribersByPlan || []}
                query={query}
                rowKey="planId"
              />
            </Card>
          </div>
        )}
      </QueryState>
    </>
  );
}

export function SubscriptionsPage() {
  const { t, locale, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.subscriptions(list.params), queryFn: () => subscriptionsApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const grantForm = useForm({ defaultValues: { userId: '', planId: '', priceId: '', reason: '', endsAt: '' } });
  const detail = useQuery({
    queryKey: queryKeys.subscription(detailId),
    queryFn: () => subscriptionsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const notes = useQuery({
    queryKey: queryKeys.supportNotes({ entityType: 'subscription', entityId: detailId }),
    queryFn: () => supportNotesApi.list({ entityType: 'subscription', entityId: detailId, limit: 50 }).then((r) => r.data),
    enabled: Boolean(detailId) && can(P.SUPPORT_NOTES_READ),
  });
  const noteForm = useForm({ defaultValues: { body: '' } });
  const invalidate = [['subscriptions'], ['subscription', detailId], ['billing-dashboard'], ['support-notes']];
  const grant = useApiMutation((body) => subscriptionsApi.grant({
    userId: body.userId,
    planId: body.planId,
    priceId: body.priceId || undefined,
    endsAt: body.endsAt || undefined,
    reason: body.reason,
  }), {
    invalidate,
    onSuccess: () => { setGrantOpen(false); grantForm.reset(); },
  });
  const cancel = useApiMutation((atPeriodEnd) => subscriptionsApi.cancel(detailId, { atPeriodEnd }), { invalidate });
  const resume = useApiMutation(() => subscriptionsApi.resume(detailId), { invalidate });
  const reconcile = useApiMutation(() => subscriptionsApi.reconcile(detailId), { invalidate });
  const addNote = useApiMutation(
    (body) => supportNotesApi.create({ entityType: 'subscription', entityId: detailId, body: body.body }),
    { invalidate: [['support-notes']], onSuccess: () => noteForm.reset() },
  );

  const columns = useMemo(
    () => [
      { key: 'user', header: t('phase4.user'), render: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.user?.fullName || '—'}</div>
          <div className="field__hint ltr">{r.user?.email}</div>
        </div>
      ) },
      { key: 'plan', header: t('phase4.plan'), render: (r) => pickPlanName(r.plan, locale) },
      { key: 'interval', header: t('phase4.interval'), render: (r) => (r.price?.billingInterval ? t(`phase4.intervals.${r.price.billingInterval}`, null, r.price.billingInterval) : '—') },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.subStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'source', header: t('phase4.source'), render: (r) => t(`phase4.sources.${r.source}`, null, r.source) },
      { key: 'gateway', header: t('phase4.gateway'), render: (r) => r.gateway || '—' },
      { key: 'start', header: t('phase4.periodStart'), render: (r) => (r.currentPeriodStart ? formatDateTime(r.currentPeriodStart) : '—') },
      { key: 'end', header: t('phase4.periodEnd'), render: (r) => (r.currentPeriodEnd ? formatDateTime(r.currentPeriodEnd) : '—') },
      { key: 'cancelAtEnd', header: t('phase4.cancelAtPeriodEnd'), render: (r) => (r.cancelAtPeriodEnd ? t('common.yes') : t('common.no')) },
    ],
    [t, locale, formatDateTime],
  );

  return (
    <>
      <PageHeader
        title={t('phase4.subscriptionsTitle')}
        subtitle={t('phase4.subscriptionsSubtitle')}
        actions={can(P.SUBSCRIPTIONS_GRANT) && (
          <Button icon={Plus} variant="primary" onClick={() => setGrantOpen(true)}>{t('phase4.grant')}</Button>
        )}
      />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'status', label: t('education.status'), options: SUB_STATUSES.map((v) => ({ value: v, label: t(`phase4.subStatus.${v}`, null, v) })) },
            { key: 'source', label: t('phase4.source'), options: ['GATEWAY', 'ADMIN_GRANT', 'PROMOTION'].map((v) => ({ value: v, label: t(`phase4.sources.${v}`, null, v) })) },
            { key: 'role', label: t('phase4.targetRole'), options: ['TEACHER', 'STUDENT'].map((v) => ({ value: v, label: t(`phase4.roles.${v}`, null, v) })) },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.subscriptionDetail')} size="lg">
        <QueryState query={detail}>
          {(s) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase4.user'), value: s.user?.fullName || s.userId },
                  { label: t('phase4.plan'), value: pickPlanName(s.plan, locale) },
                  { label: t('education.status'), value: <Badge tone={STATUS_TONE[s.status]}>{t(`phase4.subStatus.${s.status}`, null, s.status)}</Badge> },
                  { label: t('phase4.source'), value: t(`phase4.sources.${s.source}`, null, s.source) },
                  { label: t('phase4.gateway'), value: s.gateway || '—' },
                  { label: t('phase4.periodStart'), value: s.currentPeriodStart ? formatDateTime(s.currentPeriodStart) : '—' },
                  { label: t('phase4.periodEnd'), value: s.currentPeriodEnd ? formatDateTime(s.currentPeriodEnd) : '—' },
                  { label: t('phase4.cancelAtPeriodEnd'), value: s.cancelAtPeriodEnd ? t('common.yes') : t('common.no') },
                  { label: t('phase4.graceUntil'), value: s.gracePeriodEndsAt ? formatDateTime(s.gracePeriodEndsAt) : '—' },
                ]}
              />
              <div className="row wrap">
                {can(P.SUBSCRIPTIONS_UPDATE) && s.status !== 'CANCELED' && s.status !== 'EXPIRED' && (
                  <>
                    <Button size="sm" variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate(true)}>{t('phase4.cancelAtEnd')}</Button>
                    <Button size="sm" variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(false)}>{t('phase4.cancelNow')}</Button>
                  </>
                )}
                {can(P.SUBSCRIPTIONS_UPDATE) && s.cancelAtPeriodEnd && (
                  <Button size="sm" variant="primary" loading={resume.isPending} onClick={() => resume.mutate()}>{t('phase4.resume')}</Button>
                )}
                {can(P.SUBSCRIPTIONS_RECONCILE) && (
                  <Button size="sm" variant="outline" icon={RefreshCw} loading={reconcile.isPending} onClick={() => reconcile.mutate()}>{t('phase4.reconcile')}</Button>
                )}
              </div>
              {can(P.SUPPORT_NOTES_READ) && (
                <div className="stack-sm">
                  <h4 style={{ margin: 0 }}>{t('phase4.supportNotes')}</h4>
                  {(notes.data || []).map((n) => (
                    <Card key={n.id}>
                      <div className="field__hint">{formatDateTime(n.createdAt)} · {n.author?.fullName || n.authorUserId}</div>
                      <div>{n.body}</div>
                    </Card>
                  ))}
                  {can(P.SUPPORT_NOTES_CREATE) && (
                    <form className="stack-sm" onSubmit={noteForm.handleSubmit((v) => addNote.mutate(v))}>
                      <FormField label={t('phase4.noteBody')}><Textarea rows={2} {...noteForm.register('body', { required: true })} /></FormField>
                      <Button type="submit" size="sm" variant="primary" loading={addNote.isPending}>{t('phase4.addNote')}</Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>

      <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title={t('phase4.grant')}>
        <form className="stack-md" onSubmit={grantForm.handleSubmit((v) => grant.mutate(v))}>
          <FormField label="userId"><TextInput className="ltr" {...grantForm.register('userId', { required: true })} /></FormField>
          <FormField label="planId"><TextInput className="ltr" {...grantForm.register('planId', { required: true })} /></FormField>
          <FormField label="priceId"><TextInput className="ltr" {...grantForm.register('priceId')} /></FormField>
          <FormField label={t('phase4.endsAt')}><TextInput type="datetime-local" className="ltr" {...grantForm.register('endsAt')} /></FormField>
          <FormField label={t('phase4.reason')}><Textarea rows={2} {...grantForm.register('reason', { required: true })} /></FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setGrantOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={grant.isPending}>{t('phase4.grant')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PaymentsPage() {
  const { t, locale, formatDateTime } = useI18n();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.payments(list.params), queryFn: () => paymentsApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.payment(detailId),
    queryFn: () => paymentsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const columns = useMemo(
    () => [
      { key: 'user', header: t('phase4.user'), render: (r) => r.user?.fullName || r.userId },
      { key: 'amount', header: t('phase4.amount'), render: (r) => formatMoney(r.amountMinor, r.currency, locale) },
      { key: 'type', header: t('phase4.type'), render: (r) => t(`phase4.paymentTypes.${r.type}`, null, r.type) },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.paymentStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'gateway', header: t('phase4.gateway'), render: (r) => r.gateway || '—' },
      { key: 'ref', header: t('phase4.reference'), render: (r) => <span className="ltr">{r.gatewayReference || r.providerReference || '—'}</span> },
      { key: 'paidAt', header: t('phase4.paidAt'), render: (r) => (r.paidAt ? formatDateTime(r.paidAt) : '—') },
    ],
    [t, locale, formatDateTime],
  );

  return (
    <>
      <PageHeader title={t('phase4.paymentsTitle')} subtitle={t('phase4.paymentsSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'status', label: t('education.status'), options: PAY_STATUSES.map((v) => ({ value: v, label: t(`phase4.paymentStatus.${v}`, null, v) })) },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.paymentDetail')}>
        <QueryState query={detail}>
          {(p) => (
            <DescriptionList
              items={[
                { label: t('phase4.user'), value: p.user?.fullName || p.userId },
                { label: t('phase4.amount'), value: formatMoney(p.amountMinor, p.currency, locale) },
                { label: t('phase4.type'), value: t(`phase4.paymentTypes.${p.type}`, null, p.type) },
                { label: t('education.status'), value: <Badge tone={STATUS_TONE[p.status]}>{t(`phase4.paymentStatus.${p.status}`, null, p.status)}</Badge> },
                { label: t('phase4.gateway'), value: p.gateway || '—' },
                { label: t('phase4.reference'), value: <span className="ltr">{p.gatewayReference || p.providerReference || '—'}</span> },
                { label: t('phase4.subscription'), value: p.subscriptionId || '—' },
                { label: t('phase4.invoice'), value: p.invoiceId || '—' },
                { label: t('phase4.paidAt'), value: p.paidAt ? formatDateTime(p.paidAt) : '—' },
              ]}
            />
          )}
        </QueryState>
      </Modal>
    </>
  );
}

export function InvoicesPage() {
  const { t, locale, formatDateTime } = useI18n();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.invoices(list.params), queryFn: () => invoicesApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.invoice(detailId),
    queryFn: () => invoicesApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const columns = useMemo(
    () => [
      { key: 'number', header: t('phase4.invoiceNumber'), render: (r) => <span className="ltr">{r.invoiceNumber || r.number || r.id}</span> },
      { key: 'user', header: t('phase4.user'), render: (r) => r.user?.fullName || r.userId },
      { key: 'plan', header: t('phase4.plan'), render: (r) => pickPlanName(r.plan || r.subscription?.plan, locale) },
      { key: 'total', header: t('phase4.total'), render: (r) => formatMoney(r.totalMinor ?? r.amountMinor, r.currency, locale) },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.invoiceStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'issued', header: t('phase4.issuedAt'), render: (r) => (r.issuedAt ? formatDateTime(r.issuedAt) : '—') },
    ],
    [t, locale, formatDateTime],
  );

  return (
    <>
      <PageHeader title={t('phase4.invoicesTitle')} subtitle={t('phase4.invoicesSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'status', label: t('education.status'), options: INV_STATUSES.map((v) => ({ value: v, label: t(`phase4.invoiceStatus.${v}`, null, v) })) },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.invoiceDetail')}>
        <QueryState query={detail}>
          {(inv) => (
            <DescriptionList
              items={[
                { label: t('phase4.invoiceNumber'), value: <span className="ltr">{inv.invoiceNumber || inv.number || inv.id}</span> },
                { label: t('phase4.user'), value: inv.user?.fullName || inv.userId },
                { label: t('phase4.subtotal'), value: formatMoney(inv.subtotalMinor, inv.currency, locale) },
                { label: t('phase4.discount'), value: formatMoney(inv.discountMinor ?? 0, inv.currency, locale) },
                { label: t('phase4.tax'), value: formatMoney(inv.taxMinor ?? 0, inv.currency, locale) },
                { label: t('phase4.total'), value: formatMoney(inv.totalMinor ?? inv.amountMinor, inv.currency, locale) },
                { label: t('education.status'), value: <Badge tone={STATUS_TONE[inv.status]}>{t(`phase4.invoiceStatus.${inv.status}`, null, inv.status)}</Badge> },
                { label: t('phase4.receiptUrl'), value: inv.hostedInvoiceUrl || inv.invoicePdfUrl || inv.receiptUrl || '—' },
                { label: t('phase4.issuedAt'), value: inv.issuedAt ? formatDateTime(inv.issuedAt) : '—' },
              ]}
            />
          )}
        </QueryState>
      </Modal>
    </>
  );
}

export function CouponsPage() {
  const { t, locale, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.coupons(list.params), queryFn: () => couponsApi.list(list.params) });
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.coupon(detailId),
    queryFn: () => couponsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const form = useForm({
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currency: 'SAR',
      maxRedemptions: '',
      perUserLimit: 1,
    },
  });
  const create = useApiMutation((body) => couponsApi.create({
    ...body,
    discountValue: Number(body.discountValue),
    maxRedemptions: body.maxRedemptions === '' ? null : Number(body.maxRedemptions),
    perUserLimit: Number(body.perUserLimit) || 1,
    currency: body.discountType === 'FIXED_AMOUNT' ? body.currency : undefined,
  }), {
    invalidate: [['coupons']],
    onSuccess: () => { setOpen(false); form.reset(); },
  });
  const toggle = useApiMutation(
    ({ id, active }) => (active ? couponsApi.deactivate(id) : couponsApi.activate(id)),
    { invalidate: [['coupons'], ['coupon', detailId]] },
  );

  const columns = useMemo(
    () => [
      { key: 'code', header: t('phase4.couponCode'), render: (r) => <span className="ltr" style={{ fontWeight: 700 }}>{r.code}</span> },
      { key: 'name', header: t('phase4.title'), render: (r) => (locale === 'ar' ? r.nameAr : r.nameEn) },
      {
        key: 'discount',
        header: t('phase4.discount'),
        render: (r) => (r.discountType === 'PERCENTAGE' ? `${r.discountValue}%` : formatMoney(r.discountValue, r.currency, locale)),
      },
      { key: 'redemptions', header: t('phase4.redemptions'), render: (r) => `${r.redemptionCount ?? 0}${r.maxRedemptions != null ? ` / ${r.maxRedemptions}` : ''}` },
      { key: 'valid', header: t('phase4.validity'), render: (r) => `${r.validFrom ? formatDateTime(r.validFrom) : '—'} → ${r.validUntil ? formatDateTime(r.validUntil) : '—'}` },
      { key: 'status', header: t('education.status'), render: (r) => <EnumBadge value={r.status} ns="couponStatus" /> },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {can(P.COUPONS_DISABLE) && (
              <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: r.id, active: r.status === 'ACTIVE' })}>
                {r.status === 'ACTIVE' ? t('phase4.deactivate') : t('phase4.activate')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, locale, formatDateTime, can, toggle],
  );

  return (
    <>
      <PageHeader
        title={t('phase4.couponsTitle')}
        subtitle={t('phase4.couponsSubtitle')}
        actions={can(P.COUPONS_CREATE) && <Button icon={Plus} variant="primary" onClick={() => setOpen(true)}>{t('common.create')}</Button>}
      />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.couponDetail')}>
        <QueryState query={detail}>
          {(c) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase4.couponCode'), value: <span className="ltr" style={{ fontWeight: 700 }}>{c.code}</span> },
                  { label: t('education.nameAr'), value: c.nameAr },
                  { label: t('education.nameEn'), value: c.nameEn },
                  {
                    label: t('phase4.discount'),
                    value: c.discountType === 'PERCENTAGE'
                      ? `${c.discountValue}%`
                      : formatMoney(c.discountValue, c.currency, locale),
                  },
                  { label: t('phase4.redemptions'), value: `${c.redemptionCount ?? 0}${c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}` },
                  { label: t('phase4.perUserLimit'), value: c.perUserLimit ?? '—' },
                  { label: t('phase4.validity'), value: `${c.validFrom ? formatDateTime(c.validFrom) : '—'} → ${c.validUntil ? formatDateTime(c.validUntil) : '—'}` },
                  { label: t('education.status'), value: <EnumBadge value={c.status} ns="couponStatus" /> },
                ]}
              />
              {can(P.COUPONS_DISABLE) && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="outline" loading={toggle.isPending} onClick={() => toggle.mutate({ id: c.id, active: c.status === 'ACTIVE' })}>
                    {c.status === 'ACTIVE' ? t('phase4.deactivate') : t('phase4.activate')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title={t('phase4.createCoupon')}>
        <form className="stack-md" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <FormField label={t('phase4.couponCode')}><TextInput className="ltr" {...form.register('code', { required: true })} /></FormField>
          <FormField label={t('education.nameAr')}><TextInput {...form.register('nameAr', { required: true })} /></FormField>
          <FormField label={t('education.nameEn')}><TextInput {...form.register('nameEn', { required: true })} /></FormField>
          <FormField label={t('phase4.discountType')}>
            <Select {...form.register('discountType')}>
              <option value="PERCENTAGE">{t('phase4.percentage')}</option>
              <option value="FIXED_AMOUNT">{t('phase4.fixedAmount')}</option>
            </Select>
          </FormField>
          <FormField label={t('phase4.discountValue')}><TextInput type="number" className="ltr" {...form.register('discountValue', { required: true })} /></FormField>
          <FormField label={t('phase4.currency')}><TextInput className="ltr" {...form.register('currency')} /></FormField>
          <FormField label={t('phase4.maxRedemptions')}><TextInput type="number" className="ltr" {...form.register('maxRedemptions')} /></FormField>
          <FormField label={t('phase4.perUserLimit')}><TextInput type="number" className="ltr" {...form.register('perUserLimit')} /></FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={create.isPending}>{t('common.create')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function RefundsPage() {
  const { t, locale, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.refunds(list.params), queryFn: () => refundsApi.list(list.params) });
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.refund(detailId),
    queryFn: () => refundsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const form = useForm({ defaultValues: { paymentTransactionId: '', amountMinor: '', reason: '', confirm: false } });
  const create = useApiMutation((body) => refundsApi.create({
    paymentTransactionId: body.paymentTransactionId,
    amountMinor: body.amountMinor === '' ? undefined : Number(body.amountMinor),
    reason: body.reason,
    confirm: true,
  }), {
    invalidate: [['refunds'], ['payments'], ['billing-dashboard']],
    onSuccess: () => { setOpen(false); form.reset(); },
  });

  const columns = useMemo(
    () => [
      { key: 'payment', header: t('phase4.payment'), render: (r) => <span className="ltr">{r.paymentTransactionId || r.paymentId}</span> },
      { key: 'amount', header: t('phase4.amount'), render: (r) => formatMoney(r.amountMinor, r.currency, locale) },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.refundStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'reason', header: t('phase4.reason'), render: (r) => r.reason || '—' },
      { key: 'createdAt', header: t('education.updatedAt'), render: (r) => formatDateTime(r.createdAt) },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => <ViewButton onClick={() => setDetailId(r.id)} />,
      },
    ],
    [t, locale, formatDateTime],
  );

  return (
    <>
      <PageHeader
        title={t('phase4.refundsTitle')}
        subtitle={t('phase4.refundsSubtitle')}
        actions={can(P.REFUNDS_CREATE) && <Button icon={Plus} variant="primary" onClick={() => setOpen(true)}>{t('phase4.createRefund')}</Button>}
      />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.refundDetail')}>
        <QueryState query={detail}>
          {(r) => (
            <DescriptionList
              items={[
                { label: t('phase4.refundId'), value: <span className="ltr">{r.id}</span> },
                { label: t('phase4.paymentId'), value: <span className="ltr">{r.paymentTransactionId || r.payment?.id || '—'}</span> },
                {
                  label: t('phase4.paymentAmount'),
                  value: r.payment
                    ? formatMoney(r.payment.amountMinor, r.payment.currency || r.currency, locale)
                    : '—',
                },
                { label: t('phase4.amount'), value: formatMoney(r.amountMinor, r.currency, locale) },
                {
                  label: t('education.status'),
                  value: <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.refundStatus.${r.status}`, null, r.status)}</Badge>,
                },
                { label: t('phase4.reason'), value: r.reason || '—' },
                { label: t('phase4.gateway'), value: r.payment?.gateway || '—' },
                {
                  label: t('phase4.gatewayRefundId'),
                  value: <span className="ltr">{r.gatewayRefundId || '—'}</span>,
                },
                {
                  label: t('phase4.requestedBy'),
                  value: r.requestedBy
                    ? `${r.requestedBy.fullName || '—'}${r.requestedBy.email ? ` (${r.requestedBy.email})` : ''}`
                    : '—',
                },
                { label: t('phase4.processedAt'), value: r.processedAt ? formatDateTime(r.processedAt) : '—' },
                { label: t('phase4.createdAt'), value: r.createdAt ? formatDateTime(r.createdAt) : '—' },
                { label: t('education.updatedAt'), value: r.updatedAt ? formatDateTime(r.updatedAt) : '—' },
              ]}
            />
          )}
        </QueryState>
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title={t('phase4.createRefund')}>
        <form
          className="stack-md"
          onSubmit={form.handleSubmit((v) => {
            if (!v.confirm) return;
            create.mutate(v);
          })}
        >
          <FormField label={t('phase4.paymentId')}><TextInput className="ltr" {...form.register('paymentTransactionId', { required: true })} /></FormField>
          <FormField label={t('phase4.amountMinor')} hint={t('phase4.amountMinorHint')}><TextInput type="number" className="ltr" {...form.register('amountMinor')} /></FormField>
          <FormField label={t('phase4.reason')}><Textarea rows={3} {...form.register('reason', { required: true })} /></FormField>
          <Checkbox label={t('phase4.confirmRefund')} {...form.register('confirm')} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="danger" loading={create.isPending}>{t('phase4.createRefund')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function WebhooksPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.webhooks(list.params), queryFn: () => webhooksApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.webhook(detailId),
    queryFn: () => webhooksApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const retry = useApiMutation((id) => webhooksApi.retry(id), { invalidate: [['webhooks'], ['webhook', detailId]] });

  const columns = useMemo(
    () => [
      { key: 'gateway', header: t('phase4.gateway'), render: (r) => r.gateway || '—' },
      { key: 'eventId', header: t('phase4.eventId'), render: (r) => <span className="ltr">{r.eventId || r.providerEventId || '—'}</span> },
      { key: 'type', header: t('phase4.eventType'), render: (r) => <span className="ltr">{r.eventType || r.type}</span> },
      {
        key: 'status',
        header: t('education.status'),
        render: (r) => <EnumBadge value={r.status || r.processingStatus} ns="webhookProcessingStatus" />,
      },
      { key: 'received', header: t('phase4.receivedAt'), render: (r) => formatDateTime(r.receivedAt || r.createdAt) },
      { key: 'processed', header: t('phase4.processedAt'), render: (r) => (r.processedAt ? formatDateTime(r.processedAt) : '—') },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {can(P.WEBHOOKS_RETRY) && (r.status === 'FAILED' || r.processingStatus === 'FAILED') && (
              <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => retry.mutate(r.id)}>{t('common.retry')}</Button>
            )}
          </div>
        ),
      },
    ],
    [t, formatDateTime, can, retry],
  );

  return (
    <>
      <PageHeader title={t('phase4.webhooksTitle')} subtitle={t('phase4.webhooksSubtitle')} />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.webhookDetail')}>
        <QueryState query={detail}>
          {(w) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase4.gateway'), value: w.gateway || '—' },
                  { label: t('phase4.eventId'), value: <span className="ltr">{w.eventId || w.providerEventId || '—'}</span> },
                  { label: t('phase4.eventType'), value: <span className="ltr">{w.eventType || w.type}</span> },
                  { label: t('education.status'), value: <EnumBadge value={w.status || w.processingStatus} ns="webhookProcessingStatus" /> },
                  { label: t('phase4.receivedAt'), value: formatDateTime(w.receivedAt || w.createdAt) },
                  { label: t('phase4.processedAt'), value: w.processedAt ? formatDateTime(w.processedAt) : '—' },
                  { label: t('phase4.error'), value: w.errorMessage || w.lastError || '—' },
                  { label: t('phase4.subscription'), value: w.subscriptionId || '—' },
                  { label: t('phase4.payment'), value: w.paymentTransactionId || '—' },
                ]}
              />
              {can(P.WEBHOOKS_RETRY) && (w.status === 'FAILED' || w.processingStatus === 'FAILED') && (
                <Button variant="outline" icon={RefreshCw} loading={retry.isPending} onClick={() => retry.mutate(w.id)}>{t('common.retry')}</Button>
              )}
            </div>
          )}
        </QueryState>
      </Modal>
    </>
  );
}
