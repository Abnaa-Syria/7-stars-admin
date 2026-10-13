import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Send } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { broadcastsApi, deliveriesApi, devicesApi } from '@/api/admin';
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
  FilterBar,
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
import { STATUS_TONE, maskToken } from '../billing/billingUtils';

const CHANNELS = ['IN_APP', 'PUSH', 'EMAIL'];
const AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'PLAN_SUBSCRIBERS', 'CUSTOM'];

export function BroadcastsPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.broadcasts(list.params), queryFn: () => broadcastsApi.list(list.params) });
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const form = useForm({
    defaultValues: {
      titleAr: '',
      titleEn: '',
      bodyAr: '',
      bodyEn: '',
      audience: 'ALL',
      channels: ['IN_APP'],
      scheduledAt: '',
      status: 'DRAFT',
    },
  });
  const detail = useQuery({
    queryKey: queryKeys.broadcast(detailId),
    queryFn: () => broadcastsApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const preview = useQuery({
    queryKey: [...queryKeys.broadcast(detailId), 'preview'],
    queryFn: () => broadcastsApi.previewTarget(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const create = useApiMutation((body) => broadcastsApi.create({
    ...body,
    channels: Array.isArray(body.channels) ? body.channels : [body.channels].filter(Boolean),
    scheduledAt: body.scheduledAt || null,
  }), {
    invalidate: [['broadcasts']],
    onSuccess: () => { setOpen(false); form.reset(); },
  });
  const send = useApiMutation((id) => broadcastsApi.send(id, { confirm: true }), { invalidate: [['broadcasts'], ['broadcast', detailId]] });
  const cancel = useApiMutation((id) => broadcastsApi.cancel(id), { invalidate: [['broadcasts'], ['broadcast', detailId]] });

  const columns = useMemo(
    () => [
      { key: 'title', header: t('phase4.title'), render: (r) => r.titleAr || r.titleEn },
      { key: 'audience', header: t('phase4.audience'), render: (r) => t(`phase4.audiences.${r.audience}`, null, r.audience) },
      { key: 'channels', header: t('phase4.channels'), render: (r) => (r.channels || []).join(', ') },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status] || 'muted'}>{t(`phase4.broadcastStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'scheduled', header: t('phase4.scheduledAt'), render: (r) => (r.scheduledAt ? formatDateTime(r.scheduledAt) : '—') },
      { key: 'createdAt', header: t('education.updatedAt'), render: (r) => formatDateTime(r.createdAt) },
    ],
    [t, formatDateTime],
  );

  return (
    <>
      <PageHeader
        title={t('phase4.broadcastsTitle')}
        subtitle={t('phase4.broadcastsSubtitle')}
        actions={can(P.NOTIFICATIONS_BROADCAST) && <Button icon={Plus} variant="primary" onClick={() => setOpen(true)}>{t('common.create')}</Button>}
      />
      <Card>
        <DataTable columns={columns} rows={query.data?.data} query={query} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('phase4.createBroadcast')} size="lg">
        <form
          className="stack-md"
          onSubmit={form.handleSubmit((v) => {
            const selected = CHANNELS.filter((c) => v[`ch_${c}`]);
            create.mutate({ ...v, channels: selected.length ? selected : ['IN_APP'] });
          })}
        >
          <FormField label={t('phase4.titleAr')}><TextInput {...form.register('titleAr', { required: true })} /></FormField>
          <FormField label={t('phase4.titleEn')}><TextInput {...form.register('titleEn', { required: true })} /></FormField>
          <FormField label={t('phase4.bodyAr')}><Textarea rows={3} {...form.register('bodyAr', { required: true })} /></FormField>
          <FormField label={t('phase4.bodyEn')}><Textarea rows={3} {...form.register('bodyEn', { required: true })} /></FormField>
          <FormField label={t('phase4.audience')}>
            <Select {...form.register('audience')}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{t(`phase4.audiences.${a}`, null, a)}</option>)}
            </Select>
          </FormField>
          <div className="stack-sm">
            <div className="field__label">{t('phase4.channels')}</div>
            {CHANNELS.map((c) => (
              <Checkbox key={c} label={t(`phase4.channel.${c}`, null, c)} {...form.register(`ch_${c}`)} defaultChecked={c === 'IN_APP'} />
            ))}
          </div>
          <FormField label={t('phase4.scheduledAt')} optional>
            <TextInput type="datetime-local" className="ltr" {...form.register('scheduledAt')} />
          </FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={create.isPending}>{t('common.create')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.broadcastDetail')} size="lg">
        <QueryState query={detail}>
          {(b) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase4.titleAr'), value: b.titleAr },
                  { label: t('phase4.titleEn'), value: b.titleEn },
                  { label: t('phase4.bodyAr'), value: b.bodyAr },
                  { label: t('phase4.bodyEn'), value: b.bodyEn },
                  { label: t('phase4.audience'), value: t(`phase4.audiences.${b.audience}`, null, b.audience) },
                  { label: t('phase4.channels'), value: (b.channels || []).join(', ') },
                  { label: t('education.status'), value: <Badge tone={STATUS_TONE[b.status]}>{t(`phase4.broadcastStatus.${b.status}`, null, b.status)}</Badge> },
                  { label: t('phase4.targetPreview'), value: preview.data?.count ?? preview.data?.total ?? '—' },
                  { label: t('phase4.scheduledAt'), value: b.scheduledAt ? formatDateTime(b.scheduledAt) : '—' },
                ]}
              />
              <div className="row wrap">
                {can(P.NOTIFICATIONS_BROADCAST) && ['DRAFT', 'SCHEDULED'].includes(b.status) && (
                  <Button icon={Send} variant="primary" loading={send.isPending} onClick={() => send.mutate(b.id)}>{t('phase4.send')}</Button>
                )}
                {can(P.NOTIFICATIONS_BROADCAST) && ['DRAFT', 'SCHEDULED', 'SENDING'].includes(b.status) && (
                  <Button variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate(b.id)}>{t('common.cancel')}</Button>
                )}
              </div>
            </div>
          )}
        </QueryState>
      </Modal>
    </>
  );
}

export function DeliveriesPage() {
  const { t, formatDateTime } = useI18n();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.deliveries(list.params), queryFn: () => deliveriesApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.delivery(detailId),
    queryFn: () => deliveriesApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const columns = useMemo(
    () => [
      { key: 'user', header: t('phase4.user'), render: (r) => r.user?.fullName || r.userId },
      { key: 'channel', header: t('phase4.channelLabel'), render: (r) => t(`phase4.channel.${r.channel}`, null, r.channel) },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.deliveryStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'provider', header: t('phase4.provider'), render: (r) => r.provider || '—' },
      { key: 'createdAt', header: t('education.updatedAt'), render: (r) => formatDateTime(r.createdAt) },
    ],
    [t, formatDateTime],
  );

  return (
    <>
      <PageHeader title={t('phase4.deliveriesTitle')} subtitle={t('phase4.deliveriesSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'channel', label: t('phase4.channelLabel'), options: CHANNELS.map((v) => ({ value: v, label: t(`phase4.channel.${v}`, null, v) })) },
            { key: 'status', label: t('education.status'), options: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED'].map((v) => ({ value: v, label: t(`phase4.deliveryStatus.${v}`, null, v) })) },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.deliveryDetail')}>
        <QueryState query={detail}>
          {(d) => (
            <DescriptionList
              items={[
                { label: t('phase4.user'), value: d.user?.fullName || d.userId },
                { label: t('phase4.channelLabel'), value: t(`phase4.channel.${d.channel}`, null, d.channel) },
                { label: t('education.status'), value: <Badge tone={STATUS_TONE[d.status]}>{t(`phase4.deliveryStatus.${d.status}`, null, d.status)}</Badge> },
                { label: t('phase4.provider'), value: d.provider || '—' },
                { label: t('phase4.error'), value: d.errorMessage || d.lastError || '—' },
                { label: t('education.updatedAt'), value: formatDateTime(d.updatedAt || d.createdAt) },
              ]}
            />
          )}
        </QueryState>
      </Modal>
    </>
  );
}

export function DevicesPage() {
  const { t, formatDateTime } = useI18n();
  const { can } = useAuth();
  const list = useListParams();
  const query = useQuery({ queryKey: queryKeys.devices(list.params), queryFn: () => devicesApi.list(list.params) });
  const [detailId, setDetailId] = useState(null);
  const detail = useQuery({
    queryKey: queryKeys.device(detailId),
    queryFn: () => devicesApi.get(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });
  const revoke = useApiMutation((id) => devicesApi.revoke(id), { invalidate: [['devices'], ['device', detailId]] });

  const columns = useMemo(
    () => [
      { key: 'user', header: t('phase4.user'), render: (r) => r.user?.fullName || r.userId },
      { key: 'platform', header: t('phase4.platform'), render: (r) => t(`phase4.platforms.${r.platform}`, null, r.platform) },
      { key: 'token', header: t('phase4.token'), render: (r) => <span className="ltr">{maskToken(r.token)}</span> },
      { key: 'status', header: t('education.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`phase4.deviceStatus.${r.status}`, null, r.status)}</Badge> },
      { key: 'appVersion', header: t('phase4.appVersion'), render: (r) => r.appVersion || '—' },
      { key: 'lastSeen', header: t('phase4.lastSeen'), render: (r) => (r.lastSeenAt ? formatDateTime(r.lastSeenAt) : '—') },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetailId(r.id)} />
            {can(P.DEVICES_REVOKE) && r.status === 'ACTIVE' && (
              <Button size="sm" variant="danger" onClick={() => revoke.mutate(r.id)}>{t('phase4.revoke')}</Button>
            )}
          </div>
        ),
      },
    ],
    [t, formatDateTime, can, revoke],
  );

  return (
    <>
      <PageHeader title={t('phase4.devicesTitle')} subtitle={t('phase4.devicesSubtitle')} />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'platform', label: t('phase4.platform'), options: ['IOS', 'ANDROID', 'WEB'].map((v) => ({ value: v, label: t(`phase4.platforms.${v}`, null, v) })) },
            { key: 'status', label: t('education.status'), options: ['ACTIVE', 'REVOKED', 'INVALID'].map((v) => ({ value: v, label: t(`phase4.deviceStatus.${v}`, null, v) })) },
          ]}
        />
        <DataTable columns={columns} rows={query.data?.data} query={query} filtered={list.activeFilterCount > 0} onRowClick={(r) => setDetailId(r.id)} />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title={t('phase4.deviceDetail')}>
        <QueryState query={detail}>
          {(d) => (
            <div className="stack-md">
              <DescriptionList
                items={[
                  { label: t('phase4.user'), value: d.user?.fullName || d.userId },
                  { label: t('phase4.platform'), value: t(`phase4.platforms.${d.platform}`, null, d.platform) },
                  { label: t('phase4.token'), value: <span className="ltr">{maskToken(d.token)}</span> },
                  { label: t('education.status'), value: <Badge tone={STATUS_TONE[d.status]}>{t(`phase4.deviceStatus.${d.status}`, null, d.status)}</Badge> },
                  { label: t('phase4.appVersion'), value: d.appVersion || '—' },
                  { label: t('phase4.lastSeen'), value: d.lastSeenAt ? formatDateTime(d.lastSeenAt) : '—' },
                  { label: t('phase4.createdAt'), value: d.createdAt ? formatDateTime(d.createdAt) : '—' },
                ]}
              />
              {can(P.DEVICES_REVOKE) && d.status === 'ACTIVE' && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(d.id)}>{t('phase4.revoke')}</Button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>
    </>
  );
}
