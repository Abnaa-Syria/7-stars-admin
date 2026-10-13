import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, FileText, LayoutGrid, List, Trash2, Upload } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { mediaApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Drawer,
  EmptyState,
  FileUploader,
  FilterBar,
  FormField,
  Modal,
  PageHeader,
  Pagination,
  Select,
} from '@/components/ui';

const CATEGORIES = ['AVATAR', 'PROFILE_COVER', 'SYSTEM_LOGO', 'SYSTEM_IMAGE', 'OTHER'];
const VISIBILITIES = ['PUBLIC', 'PRIVATE'];

function isImage(mime) {
  return String(mime || '').startsWith('image/');
}

export default function MediaPage() {
  const { t, formatBytes, formatDateTime } = useI18n();
  const { can } = useAuth();
  const toast = useToast();
  const settings = usePublicSettings();
  const list = useListParams({ view: 'grid' });
  const { params, setParams } = list;
  const view = params.view === 'list' ? 'list' : 'grid';

  const query = useQuery({ queryKey: queryKeys.media(params), queryFn: () => mediaApi.list(params) });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('OTHER');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [progress, setProgress] = useState(null);

  const upload = useApiMutation((payload) => mediaApi.upload(payload, (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)), {
    invalidate: [['media'], ['audit-logs']],
    onSuccess: () => {
      setUploadOpen(false);
      setFile(null);
      setProgress(null);
    },
  });
  const remove = useApiMutation((id) => mediaApi.remove(id), {
    invalidate: [['media'], ['audit-logs'], ['settings'], ['admin-dashboard']],
    onSuccess: () => {
      setPendingDelete(null);
      setSelected(null);
    },
  });

  const accept = settings.allowedMimeTypes || [];
  const rows = query.data?.data || [];

  const columns = useMemo(
    () => [
      {
        key: 'file',
        header: t('media.filename'),
        sortKey: 'originalName',
        render: (m) => (
          <div className="row">
            {isImage(m.mimeType) && m.url ? <img src={m.url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8 }} /> : <FileText size={18} />}
            <span className="truncate">{m.originalName}</span>
          </div>
        ),
      },
      { key: 'category', header: t('media.category'), render: (m) => <Badge>{t(`enums.mediaCategory.${m.category}`)}</Badge> },
      { key: 'visibility', header: t('media.visibility'), render: (m) => <Badge tone={m.visibility === 'PUBLIC' ? 'success' : 'muted'}>{t(`enums.visibility.${m.visibility}`)}</Badge> },
      { key: 'sizeBytes', header: t('media.size'), sortKey: 'sizeBytes', render: (m) => formatBytes(m.sizeBytes) },
      { key: 'uploader', header: t('media.uploader'), render: (m) => m.uploadedBy?.fullName || t('audit.system') },
      { key: 'createdAt', header: t('media.uploadedAt'), sortKey: 'createdAt', render: (m) => formatDateTime(m.createdAt) },
    ],
    [t, formatBytes, formatDateTime],
  );

  const copyUrl = async (url) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success(t('common.copied'));
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title={t('media.title')}
        subtitle={t('media.subtitle')}
        actions={
          can(P.MEDIA_UPLOAD) && (
            <Button variant="primary" icon={Upload} onClick={() => setUploadOpen(true)}>
              {t('media.upload')}
            </Button>
          )
        }
      />
      <Card>
        <FilterBar
          {...list}
          filters={[
            { key: 'category', label: t('media.category'), options: CATEGORIES.map((c) => ({ value: c, label: t(`enums.mediaCategory.${c}`) })) },
            { key: 'visibility', label: t('media.visibility'), options: VISIBILITIES.map((v) => ({ value: v, label: t(`enums.visibility.${v}`) })) },
            { key: 'fileType', label: t('media.fileType'), options: [{ value: 'image', label: t('enums.fileType.image') }, { value: 'document', label: t('enums.fileType.document') }] },
            { key: 'createdFrom', label: t('common.from'), type: 'date' },
            { key: 'createdTo', label: t('common.to'), type: 'date' },
          ]}
          end={
            <div className="row">
              <Button size="sm" variant={view === 'grid' ? 'gold-outline' : 'ghost'} icon={LayoutGrid} onClick={() => setParams({ view: 'grid' })} aria-label={t('common.grid')} />
              <Button size="sm" variant={view === 'list' ? 'gold-outline' : 'ghost'} icon={List} onClick={() => setParams({ view: 'list' })} aria-label={t('common.list')} />
            </div>
          }
        />
        {view === 'grid' ? (
          query.isPending || query.isError ? (
            <DataTable columns={columns} rows={rows} query={query} />
          ) : rows.length ? (
            <div className="media-grid">
              {rows.map((m) => (
                <button key={m.id} type="button" className="media-tile" onClick={() => setSelected(m)}>
                  <div className="media-tile__thumb">{isImage(m.mimeType) && m.url ? <img src={m.url} alt="" /> : <FileText size={28} />}</div>
                  <div className="media-tile__body">
                    <div className="media-tile__name truncate">{m.originalName}</div>
                    <div className="media-tile__meta">
                      {t(`enums.mediaCategory.${m.category}`)} · {formatBytes(m.sizeBytes)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState filtered={list.activeFilterCount > 0} />
          )
        ) : (
          <DataTable columns={columns} rows={rows} query={query} filtered={list.activeFilterCount > 0} sort={params} onSortChange={setParams} onRowClick={setSelected} />
        )}
        <Pagination meta={query.data?.meta} onChange={setParams} />
      </Card>

      <Modal
        open={uploadOpen}
        onClose={() => !upload.isPending && setUploadOpen(false)}
        title={t('media.uploadTitle')}
        locked={upload.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadOpen(false)} disabled={upload.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon={Upload} disabled={!file} loading={upload.isPending} onClick={() => upload.mutate({ file, category, visibility })}>
              {t('media.upload')}
            </Button>
          </>
        }
      >
        <div className="stack">
          <FormField label={t('media.category')}>
            {({ id }) => <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES.map((c) => ({ value: c, label: t(`enums.mediaCategory.${c}`) }))} />}
          </FormField>
          <FormField label={t('media.visibility')}>
            {({ id }) => <Select id={id} value={visibility} onChange={(e) => setVisibility(e.target.value)} options={VISIBILITIES.map((v) => ({ value: v, label: t(`enums.visibility.${v}`) }))} />}
          </FormField>
          <FileUploader accept={accept} maxMb={settings.maxUploadSizeMb} file={file} onSelect={setFile} progress={progress} disabled={upload.isPending} />
        </div>
      </Modal>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('media.details')}
        footer={
          selected && (
            <>
              {selected.url && (
                <Button variant="outline" icon={Copy} onClick={() => copyUrl(selected.url)}>
                  {t('media.copyUrl')}
                </Button>
              )}
              {can(P.MEDIA_DELETE) && (
                <Button variant="danger" icon={Trash2} onClick={() => setPendingDelete(selected)}>
                  {t('common.delete')}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="stack">
            <div className="media-preview">
              {isImage(selected.mimeType) && selected.url ? <img src={selected.url} alt="" /> : <span className="muted">{t('media.noPreview')}</span>}
            </div>
            {selected.visibility === 'PRIVATE' && <p className="field__hint">{t('media.privateNotice')}</p>}
            <DescriptionList
              items={[
                { label: t('media.filename'), value: selected.originalName, full: true },
                { label: t('media.category'), value: t(`enums.mediaCategory.${selected.category}`) },
                { label: t('media.visibility'), value: t(`enums.visibility.${selected.visibility}`) },
                { label: t('media.type'), value: <span className="ltr">{selected.mimeType}</span> },
                { label: t('media.size'), value: formatBytes(selected.sizeBytes) },
                { label: t('media.uploader'), value: selected.uploadedBy?.fullName },
                { label: t('media.uploadedAt'), value: formatDateTime(selected.createdAt) },
                { label: t('media.checksum'), value: selected.metadata?.sha256 && <span className="mono">{selected.metadata.sha256}</span>, full: true },
                { label: t('media.dimensions'), value: selected.metadata?.width ? `${selected.metadata.width}×${selected.metadata.height}` : null },
              ]}
            />
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t('media.deleteTitle')}
        body={t('media.deleteBody', { name: pendingDelete?.originalName })}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
