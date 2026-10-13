import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useListParams } from '@/hooks/useListParams';
import { useApiMutation } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  EnumBadge,
  FilterBar,
  FormField,
  TextInput,
  Modal,
  PageHeader,
  Pagination,
  Textarea,
  ViewButton,
} from '@/components/ui';

const schema = z.object({
  nameAr: z.string().trim().min(2).max(150),
  nameEn: z.string().trim().min(2).max(150),
  slug: z.string().trim().optional(),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export default function CategoriesPage() {
  const { t, formatDate } = useI18n();
  const { can } = useAuth();
  const list = useListParams({ sortBy: 'sortOrder', sortOrder: 'asc' });
  const query = useQuery({ queryKey: queryKeys.categories(list.params), queryFn: () => categoriesApi.list(list.params) });
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { nameAr: '', nameEn: '', slug: '', descriptionAr: '', descriptionEn: '', sortOrder: 0 } });

  const invalidate = [['categories'], ['audit-logs']];
  const save = useApiMutation(
    (values) => (editing?.id ? categoriesApi.update(editing.id, values) : categoriesApi.create(values)),
    {
      invalidate,
      onSuccess: () => {
        setEditing(null);
        form.reset();
      },
    },
  );
  const remove = useApiMutation((id) => categoriesApi.remove(id), {
    invalidate,
    onSuccess: () => setPendingDelete(null),
  });
  const activate = useApiMutation((id) => categoriesApi.activate(id), { invalidate });
  const deactivate = useApiMutation((id) => categoriesApi.deactivate(id), { invalidate });

  const openCreate = () => {
    form.reset({ nameAr: '', nameEn: '', slug: '', descriptionAr: '', descriptionEn: '', sortOrder: 0 });
    setEditing({ id: null });
  };
  const openEdit = (row) => {
    form.reset({
      nameAr: row.nameAr || '',
      nameEn: row.nameEn || '',
      slug: row.slug || '',
      descriptionAr: row.descriptionAr || '',
      descriptionEn: row.descriptionEn || '',
      sortOrder: row.sortOrder ?? 0,
    });
    setEditing(row);
  };

  const columns = useMemo(
    () => [
      { key: 'name', header: t('education.category'), sortKey: 'name', render: (r) => <div><div style={{ fontWeight: 700 }}>{r.name}</div><div className="field__hint ltr">{r.slug}</div></div> },
      { key: 'status', header: t('education.status'), render: (r) => <EnumBadge value={r.status} ns="categoryStatus" /> },
      { key: 'courses', header: t('education.courses'), render: (r) => r.coursesCount ?? 0 },
      { key: 'sortOrder', header: t('education.sortOrder'), sortKey: 'sortOrder', render: (r) => r.sortOrder },
      { key: 'createdAt', header: t('phase4.createdAt'), sortKey: 'createdAt', render: (r) => formatDate(r.createdAt) },
      {
        key: 'actions',
        header: '',
        className: 'actions-cell',
        render: (r) => (
          <div className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 4 }}>
            <ViewButton onClick={() => setDetail(r)} />
            {can(P.COURSE_CATEGORIES_UPDATE) && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(r)} aria-label={t('common.edit')} />}
            {can(P.COURSE_CATEGORIES_UPDATE) && r.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" onClick={() => deactivate.mutate(r.id)}>{t('education.actions.deactivate')}</Button>
            )}
            {can(P.COURSE_CATEGORIES_UPDATE) && r.status === 'INACTIVE' && (
              <Button size="sm" variant="outline" onClick={() => activate.mutate(r.id)}>{t('education.actions.activate')}</Button>
            )}
            {can(P.COURSE_CATEGORIES_DELETE) && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setPendingDelete(r)} aria-label={t('common.delete')} />
            )}
          </div>
        ),
      },
    ],
    [t, formatDate, can, activate, deactivate],
  );

  return (
    <>
      <PageHeader
        title={t('education.categoriesTitle')}
        subtitle={t('education.categoriesSubtitle')}
        actions={can(P.COURSE_CATEGORIES_CREATE) && <Button variant="primary" icon={Plus} onClick={openCreate}>{t('education.createCategory')}</Button>}
      />
      <Card>
        <FilterBar
          {...list}
          filters={[{ key: 'status', label: t('education.status'), options: [{ value: 'ACTIVE', label: t('enums.categoryStatus.ACTIVE') }, { value: 'INACTIVE', label: t('enums.categoryStatus.INACTIVE') }] }]}
        />
        <DataTable
          columns={columns}
          rows={query.data?.data}
          query={query}
          filtered={list.activeFilterCount > 0}
          sort={list.params}
          onSortChange={list.setParams}
          onRowClick={(r) => setDetail(r)}
        />
        <Pagination meta={query.data?.meta} onChange={list.setParams} />
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={t('common.details')}>
        {detail && (
          <DescriptionList
            items={[
              { label: t('education.nameAr'), value: detail.nameAr || detail.name },
              { label: t('education.nameEn'), value: detail.nameEn || '—' },
              { label: t('phase3.code'), value: <span className="ltr">{detail.slug}</span> },
              { label: t('education.status'), value: <EnumBadge value={detail.status} ns="categoryStatus" /> },
              { label: t('education.courses'), value: detail.coursesCount ?? 0 },
              { label: t('education.sortOrder'), value: detail.sortOrder },
              { label: t('education.shortDescription'), value: detail.descriptionAr || detail.descriptionEn || '—' },
            ]}
          />
        )}
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? t('education.editCategory') : t('education.createCategory')}>
        <form className="stack-md" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <FormField label={t('education.nameAr')} error={form.formState.errors.nameAr?.message}>
            <TextInput {...form.register('nameAr')} />
          </FormField>
          <FormField label={t('education.nameEn')} error={form.formState.errors.nameEn?.message}>
            <TextInput {...form.register('nameEn')} />
          </FormField>
          <FormField label={t('education.slug')} hint={t('education.slugHint')}>
            <TextInput className="ltr" {...form.register('slug')} />
          </FormField>
          <FormField label={t('education.descriptionAr')}>
            <Textarea rows={3} {...form.register('descriptionAr')} />
          </FormField>
          <FormField label={t('education.descriptionEn')}>
            <Textarea rows={3} {...form.register('descriptionEn')} />
          </FormField>
          <FormField label={t('education.sortOrder')}>
            <TextInput type="number" {...form.register('sortOrder')} />
          </FormField>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" loading={save.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t('education.deleteCategory')}
        body={pendingDelete?.name}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
