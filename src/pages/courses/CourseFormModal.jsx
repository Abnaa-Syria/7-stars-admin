import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { categoriesApi, coursesApi, mediaApi, teachersApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { Button, FileUploader, FormField, Modal, Select, TextInput, Textarea } from '@/components/ui';

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  teacherId: z.string().uuid(),
  categoryId: z.string().uuid(),
  shortDescription: z.string().max(500).optional().or(z.literal('')),
  fullDescription: z.string().max(20000).optional().or(z.literal('')),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']),
  enrollmentMode: z.enum(['APPROVAL_REQUIRED', 'AUTO_APPROVE']),
  contentAccessMode: z.enum(['FREE', 'SEQUENTIAL']),
  estimatedDurationMinutes: z.union([z.literal(''), z.coerce.number().int().min(1).max(100000)]).optional(),
  maxStudents: z.union([z.literal(''), z.coerce.number().int().min(1).max(100000)]).optional(),
  coverMediaId: z.string().optional().or(z.literal('')),
});

const defaults = {
  title: '',
  teacherId: '',
  categoryId: '',
  shortDescription: '',
  fullDescription: '',
  level: 'BEGINNER',
  visibility: 'PRIVATE',
  enrollmentMode: 'APPROVAL_REQUIRED',
  contentAccessMode: 'FREE',
  estimatedDurationMinutes: '',
  maxStudents: '',
  coverMediaId: '',
};

function toPayload(values) {
  return {
    title: values.title.trim(),
    teacherId: values.teacherId,
    categoryId: values.categoryId,
    shortDescription: values.shortDescription?.trim() || null,
    fullDescription: values.fullDescription?.trim() || null,
    level: values.level,
    visibility: values.visibility,
    enrollmentMode: values.enrollmentMode,
    contentAccessMode: values.contentAccessMode,
    estimatedDurationMinutes: values.estimatedDurationMinutes === '' || values.estimatedDurationMinutes == null ? null : Number(values.estimatedDurationMinutes),
    maxStudents: values.maxStudents === '' || values.maxStudents == null ? null : Number(values.maxStudents),
    coverMediaId: values.coverMediaId?.trim() || null,
  };
}

export default function CourseFormModal({ open, course, onClose }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isEdit = Boolean(course?.id);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverPreview, setCoverPreview] = useState(null);

  const teachers = useQuery({
    queryKey: queryKeys.teachers({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => teachersApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'createdAt' }),
    enabled: open,
  });
  const categories = useQuery({
    queryKey: queryKeys.categories({ limit: 100, status: 'ACTIVE' }),
    queryFn: () => categoriesApi.list({ limit: 100, status: 'ACTIVE', sortBy: 'sortOrder', sortOrder: 'asc' }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setUploadFile(null);
    setUploadProgress(0);
    if (course) {
      form.reset({
        title: course.title || '',
        teacherId: course.teacherId || course.teacher?.id || '',
        categoryId: course.categoryId || course.category?.id || '',
        shortDescription: course.shortDescription || '',
        fullDescription: course.fullDescription || '',
        level: course.level || 'BEGINNER',
        visibility: course.visibility || 'PRIVATE',
        enrollmentMode: course.enrollmentMode || 'APPROVAL_REQUIRED',
        contentAccessMode: course.contentAccessMode || 'FREE',
        estimatedDurationMinutes: course.estimatedDurationMinutes ?? '',
        maxStudents: course.maxStudents ?? '',
        coverMediaId: course.cover?.id || course.coverMediaId || '',
      });
      setCoverPreview(course.cover?.url || null);
    } else {
      form.reset(defaults);
      setCoverPreview(null);
    }
  }, [open, course, form]);

  const save = useApiMutation(
    (values) => {
      const body = toPayload(values);
      return isEdit ? coursesApi.update(course.id, body) : coursesApi.create(body);
    },
    {
      invalidate: [['courses'], ['course', course?.id].filter(Boolean), ['audit-logs']],
      onSuccess: (result) => {
        onClose();
        if (!isEdit && result?.data?.id) navigate(`/courses/${result.data.id}?tab=curriculum`);
      },
      onError: (error) => applyServerErrors(error, form.setError),
    },
  );

  const uploadCover = useApiMutation(
    ({ file }) => mediaApi.upload({ file, category: 'OTHER', visibility: 'PUBLIC' }, (e) => setUploadProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)),
    {
      successMessage: false,
      onSuccess: (result) => {
        const id = result?.data?.id;
        const url = result?.data?.url;
        if (!id) return;
        form.setValue('coverMediaId', id);
        setCoverPreview(url || null);
        setUploadFile(null);
        setUploadProgress(0);
      },
    },
  );

  const teacherOptions = (teachers.data?.data || []).map((u) => ({
    value: u.id,
    label: u.fullName || u.email || u.id,
  }));
  const categoryOptions = (categories.data?.data || []).map((c) => ({
    value: c.id,
    label: c.name || c.nameAr || c.slug,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('education.editCourse') : t('education.createCourse')}
      size="lg"
      locked={save.isPending || uploadCover.isPending}
    >
      <form className="stack-md" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <FormField label={t('education.title')} required error={form.formState.errors.title?.message}>
          <TextInput {...form.register('title')} />
        </FormField>

        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <FormField className="grow" label={t('education.assignTeacher')} required error={form.formState.errors.teacherId?.message}>
            <Select
              {...form.register('teacherId')}
              placeholder={t('education.selectTeacher')}
              options={teacherOptions}
            />
          </FormField>
          <FormField className="grow" label={t('education.category')} required error={form.formState.errors.categoryId?.message}>
            <Select
              {...form.register('categoryId')}
              placeholder={t('education.selectCategory')}
              options={categoryOptions}
            />
          </FormField>
        </div>

        <FormField label={t('education.coverImage')}>
          {coverPreview ? (
            <img
              src={coverPreview}
              alt=""
              style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 8 }}
            />
          ) : (
            <div className="field__hint" style={{ marginBottom: 8 }}>
              {t('education.noCover')}
            </div>
          )}
          <FileUploader
            accept={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
            maxMb={10}
            file={uploadFile}
            onSelect={setUploadFile}
            progress={uploadProgress}
            disabled={uploadCover.isPending}
          />
          {uploadFile && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              style={{ marginTop: 8 }}
              loading={uploadCover.isPending}
              onClick={() => uploadCover.mutate({ file: uploadFile })}
            >
              {t('education.uploadCover')}
            </Button>
          )}
          <input type="hidden" {...form.register('coverMediaId')} />
        </FormField>

        <FormField label={t('education.shortDescription')} error={form.formState.errors.shortDescription?.message}>
          <Textarea rows={2} {...form.register('shortDescription')} />
        </FormField>
        <FormField label={t('education.fullDescription')} error={form.formState.errors.fullDescription?.message}>
          <Textarea rows={4} {...form.register('fullDescription')} />
        </FormField>

        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <FormField label={t('education.level')}>
            <Select
              {...form.register('level')}
              options={['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((v) => ({
                value: v,
                label: t(`enums.courseLevel.${v}`, null, v),
              }))}
            />
          </FormField>
          <FormField label={t('education.visibility')}>
            <Select
              {...form.register('visibility')}
              options={['PRIVATE', 'UNLISTED', 'PUBLIC'].map((v) => ({
                value: v,
                label: t(`enums.courseVisibility.${v}`, null, v),
              }))}
            />
          </FormField>
          <FormField label={t('education.enrollmentMode')}>
            <Select
              {...form.register('enrollmentMode')}
              options={['APPROVAL_REQUIRED', 'AUTO_APPROVE'].map((v) => ({
                value: v,
                label: t(`enums.enrollmentMode.${v}`, null, v),
              }))}
            />
          </FormField>
          <FormField label={t('education.accessMode')}>
            <Select
              {...form.register('contentAccessMode')}
              options={['FREE', 'SEQUENTIAL'].map((v) => ({
                value: v,
                label: t(`enums.contentAccessMode.${v}`, null, v),
              }))}
            />
          </FormField>
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <FormField className="grow" label={t('education.durationMinutes')}>
            <TextInput type="number" min={1} {...form.register('estimatedDurationMinutes')} />
          </FormField>
          <FormField className="grow" label={t('education.maxStudents')}>
            <TextInput type="number" min={1} {...form.register('maxStudents')} />
          </FormField>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
