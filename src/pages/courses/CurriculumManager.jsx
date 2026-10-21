import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { coursesApi, mediaApi } from '@/api/admin';
import { useApiMutation, applyServerErrors } from '@/hooks/useApiMutation';
import { P } from '@/utils/permissions';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FormField,
  Modal,
  Select,
  TextInput,
  FileUploader,
  BilingualField,
  bilingualDefaults,
  bilingualPayload,
} from '@/components/ui';

const LESSON_TYPES = ['TEXT', 'VIDEO', 'DOCUMENT', 'AUDIO', 'EXTERNAL_LINK'];
const RESOURCE_TYPES = ['PDF', 'DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'LINK', 'ARCHIVE', 'OTHER'];
const MODULE_TR = ['title', 'description'];
const LESSON_TR = ['title', 'description', 'textContent'];
const RESOURCE_TR = ['title'];
const titleAr = z.string().trim().min(2).max(200);
const titleEn = z.string().max(200).optional().or(z.literal(''));

const moduleSchema = z.object({
  titleAr,
  titleEn,
  descriptionAr: z.string().max(5000).optional().or(z.literal('')),
  descriptionEn: z.string().max(5000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  isRequired: z.boolean().optional(),
});

const lessonSchema = z.object({
  titleAr,
  titleEn,
  descriptionAr: z.string().max(5000).optional().or(z.literal('')),
  descriptionEn: z.string().max(5000).optional().or(z.literal('')),
  lessonType: z.enum(LESSON_TYPES),
  textContentAr: z.string().max(200000).optional().or(z.literal('')),
  textContentEn: z.string().max(200000).optional().or(z.literal('')),
  externalUrl: z.string().max(1000).optional().or(z.literal('')),
  videoMediaId: z.string().optional().or(z.literal('')),
  documentMediaId: z.string().optional().or(z.literal('')),
  audioMediaId: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  isRequired: z.boolean().optional(),
  estimatedDurationMinutes: z.union([z.literal(''), z.coerce.number().int().min(1).max(100000)]).optional(),
});

const resourceSchema = z.object({
  titleAr,
  titleEn,
  resourceType: z.enum(RESOURCE_TYPES),
  externalUrl: z.string().max(1000).optional().or(z.literal('')),
  mediaFileId: z.string().optional().or(z.literal('')),
  isDownloadable: z.boolean().optional(),
});

function cleanUuid(value) {
  const v = (value || '').trim();
  return v || null;
}

function lessonPayload(values) {
  return {
    ...bilingualPayload(values, LESSON_TR),
    lessonType: values.lessonType,
    externalUrl: values.externalUrl?.trim() || null,
    videoMediaId: cleanUuid(values.videoMediaId),
    documentMediaId: cleanUuid(values.documentMediaId),
    audioMediaId: cleanUuid(values.audioMediaId),
    status: values.status,
    isRequired: values.isRequired !== false,
    estimatedDurationMinutes:
      values.estimatedDurationMinutes === '' || values.estimatedDurationMinutes == null
        ? null
        : Number(values.estimatedDurationMinutes),
  };
}

function buildReorderItems(list, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= list.length) return null;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map((row, i) => ({ id: row.id, position: i + 1 }));
}

export default function CurriculumManager({ courseId, modules = [] }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const invalidate = [['course', courseId], ['courses'], ['audit-logs']];

  const [moduleModal, setModuleModal] = useState(null);
  const [lessonModal, setLessonModal] = useState(null);
  const [resourceModal, setResourceModal] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resourceUploadFile, setResourceUploadFile] = useState(null);
  const [resourceUploadProgress, setResourceUploadProgress] = useState(0);

  const moduleForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: { ...bilingualDefaults(null, MODULE_TR), status: 'DRAFT', isRequired: true },
  });
  const lessonForm = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      ...bilingualDefaults(null, LESSON_TR),
      lessonType: 'TEXT',
      externalUrl: '',
      videoMediaId: '',
      documentMediaId: '',
      audioMediaId: '',
      status: 'DRAFT',
      isRequired: true,
      estimatedDurationMinutes: '',
    },
  });
  const resourceForm = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: { ...bilingualDefaults(null, RESOURCE_TR), resourceType: 'PDF', externalUrl: '', mediaFileId: '', isDownloadable: true },
  });

  const lessonType = lessonForm.watch('lessonType');
  const resourceType = resourceForm.watch('resourceType');

  useEffect(() => {
    if (!moduleModal) return;
    if (moduleModal.id) {
      moduleForm.reset({
        ...bilingualDefaults(moduleModal, MODULE_TR),
        status: moduleModal.status || 'DRAFT',
        isRequired: moduleModal.isRequired !== false,
      });
    } else {
      moduleForm.reset({ ...bilingualDefaults(null, MODULE_TR), status: 'DRAFT', isRequired: true });
    }
  }, [moduleModal, moduleForm]);

  useEffect(() => {
    if (!lessonModal) return;
    setUploadFile(null);
    setUploadProgress(0);
    if (lessonModal.lesson) {
      const l = lessonModal.lesson;
      lessonForm.reset({
        ...bilingualDefaults(l, LESSON_TR),
        lessonType: l.lessonType || 'TEXT',
        externalUrl: l.externalUrl || '',
        videoMediaId: l.videoMediaId || l.video?.id || '',
        documentMediaId: l.documentMediaId || l.document?.id || '',
        audioMediaId: l.audioMediaId || l.audio?.id || '',
        status: l.status || 'DRAFT',
        isRequired: l.isRequired !== false,
        estimatedDurationMinutes: l.estimatedDurationMinutes ?? '',
      });
    } else {
      lessonForm.reset({
        ...bilingualDefaults(null, LESSON_TR),
        lessonType: 'TEXT',
        externalUrl: '',
        videoMediaId: '',
        documentMediaId: '',
        audioMediaId: '',
        status: 'DRAFT',
        isRequired: true,
        estimatedDurationMinutes: '',
      });
    }
  }, [lessonModal, lessonForm]);

  useEffect(() => {
    if (!resourceModal) return;
    setResourceUploadFile(null);
    setResourceUploadProgress(0);
    resourceForm.reset({ ...bilingualDefaults(null, RESOURCE_TR), resourceType: 'PDF', externalUrl: '', mediaFileId: '', isDownloadable: true });
  }, [resourceModal, resourceForm]);

  const saveModule = useApiMutation(
    (values) => {
      const body = {
        ...bilingualPayload(values, MODULE_TR),
        status: values.status,
        isRequired: values.isRequired !== false,
      };
      return moduleModal?.id
        ? coursesApi.updateModule(courseId, moduleModal.id, body)
        : coursesApi.createModule(courseId, body);
    },
    {
      invalidate,
      onSuccess: () => setModuleModal(null),
      onError: (error) => applyServerErrors(error, moduleForm.setError),
    },
  );

  const saveLesson = useApiMutation(
    (values) => {
      const body = lessonPayload(values);
      return lessonModal?.lesson?.id
        ? coursesApi.updateLesson(lessonModal.lesson.id, body)
        : coursesApi.createLesson(lessonModal.moduleId, body);
    },
    {
      invalidate,
      onSuccess: () => setLessonModal(null),
      onError: (error) => applyServerErrors(error, lessonForm.setError),
    },
  );

  const saveResource = useApiMutation(
    (values) => {
      const body = {
        ...bilingualPayload(values, RESOURCE_TR),
        resourceType: values.resourceType,
        externalUrl: values.externalUrl?.trim() || null,
        mediaFileId: cleanUuid(values.mediaFileId),
        isDownloadable: values.isDownloadable !== false,
      };
      return coursesApi.createResource(resourceModal.lessonId, body);
    },
    {
      invalidate,
      onSuccess: () => setResourceModal(null),
      onError: (error) => applyServerErrors(error, resourceForm.setError),
    },
  );

  const remove = useApiMutation(
    () => {
      if (pendingDelete?.type === 'module') return coursesApi.removeModule(courseId, pendingDelete.id);
      if (pendingDelete?.type === 'lesson') return coursesApi.removeLesson(pendingDelete.id);
      if (pendingDelete?.type === 'resource') return coursesApi.removeResource(pendingDelete.lessonId, pendingDelete.id);
      return Promise.reject(new Error('Unknown delete'));
    },
    {
      invalidate,
      onSuccess: () => setPendingDelete(null),
    },
  );

  const reorderModules = useApiMutation((items) => coursesApi.reorderModules(courseId, items), { invalidate });
  const reorderLessons = useApiMutation(
    ({ moduleId, items }) => coursesApi.reorderLessons(moduleId, items),
    { invalidate },
  );

  const uploadMedia = useApiMutation(
    ({ file, category }) => mediaApi.upload({ file, category, visibility: 'PRIVATE' }, (e) => setUploadProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)),
    {
      successMessage: false,
      onSuccess: (result) => {
        const id = result?.data?.id;
        if (!id) return;
        if (lessonType === 'VIDEO') lessonForm.setValue('videoMediaId', id);
        if (lessonType === 'DOCUMENT') lessonForm.setValue('documentMediaId', id);
        if (lessonType === 'AUDIO') lessonForm.setValue('audioMediaId', id);
        setUploadFile(null);
        setUploadProgress(0);
      },
    },
  );

  const uploadResourceMedia = useApiMutation(
    ({ file }) =>
      mediaApi.upload({ file, category: 'LESSON_RESOURCE', visibility: 'PRIVATE' }, (e) =>
        setResourceUploadProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      ),
    {
      successMessage: false,
      onSuccess: (result) => {
        const id = result?.data?.id;
        if (!id) return;
        resourceForm.setValue('mediaFileId', id);
        setResourceUploadFile(null);
        setResourceUploadProgress(0);
      },
    },
  );

  const mediaCategory = lessonType === 'VIDEO' ? 'LESSON_VIDEO' : lessonType === 'AUDIO' ? 'LESSON_AUDIO' : 'LESSON_DOCUMENT';
  const accept =
    lessonType === 'VIDEO'
      ? ['video/mp4', 'video/webm', 'video/quicktime']
      : lessonType === 'AUDIO'
        ? ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']
        : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const moveModule = (index, direction) => {
    const items = buildReorderItems(modules, index, index + direction);
    if (items) reorderModules.mutate(items);
  };

  const moveLesson = (mod, lessonIndex, direction) => {
    const lessons = mod.lessons || [];
    const items = buildReorderItems(lessons, lessonIndex, lessonIndex + direction);
    if (items) reorderLessons.mutate({ moduleId: mod.id, items });
  };

  return (
    <div className="stack-md">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p className="field__hint" style={{ margin: 0 }}>
          {t('education.curriculumHint')}
        </p>
        {can(P.MODULES_CREATE) && (
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setModuleModal({ id: null })}>
            {t('education.createModule')}
          </Button>
        )}
      </div>

      {modules.length === 0 && <EmptyState title={t('education.emptyCurriculum')} body={t('education.curriculumHint')} />}

      {modules.map((mod, modIndex) => (
        <Card key={mod.id}>
          <CardHeader
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  {mod.position}. {mod.title}
                </span>
                <Badge tone={mod.status === 'PUBLISHED' ? 'success' : 'muted'}>
                  {t(`enums.curriculumStatus.${mod.status}`, null, mod.status)}
                </Badge>
                {mod.isRequired === false && <Badge>{t('education.optionalLesson')}</Badge>}
              </span>
            }
            actions={
              <div className="row">
                {can(P.MODULES_UPDATE) && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={ArrowUp}
                      disabled={modIndex === 0 || reorderModules.isPending}
                      onClick={() => moveModule(modIndex, -1)}
                      aria-label={t('education.moveUp')}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={ArrowDown}
                      disabled={modIndex === modules.length - 1 || reorderModules.isPending}
                      onClick={() => moveModule(modIndex, 1)}
                      aria-label={t('education.moveDown')}
                    />
                  </>
                )}
                {can(P.LESSONS_CREATE) && (
                  <Button size="sm" variant="outline" icon={Plus} onClick={() => setLessonModal({ moduleId: mod.id, lesson: null })}>
                    {t('education.addLesson')}
                  </Button>
                )}
                {can(P.MODULES_UPDATE) && (
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setModuleModal(mod)} aria-label={t('common.edit')} />
                )}
                {can(P.MODULES_DELETE) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => setPendingDelete({ type: 'module', id: mod.id, label: mod.title })}
                    aria-label={t('common.delete')}
                  />
                )}
              </div>
            }
          />
          <div className="curriculum-list">
            {(mod.lessons || []).length === 0 && <div className="field__hint" style={{ padding: '8px 8px 4px' }}>{t('education.noLessons')}</div>}
            {(mod.lessons || []).map((lesson, lessonIndex) => (
              <div key={lesson.id} className="curriculum-lesson">
                <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-title">
                    {lesson.position}. {lesson.title}
                  </div>
                  <div className="curriculum-lesson__meta field__hint">
                    <span>{t(`enums.lessonType.${lesson.lessonType}`, null, lesson.lessonType)}</span>
                    <span>·</span>
                    <span>{t(`enums.curriculumStatus.${lesson.status}`, null, lesson.status)}</span>
                    {lesson.isRequired ? (
                      <>
                        <span>·</span>
                        <span>{t('education.required')}</span>
                      </>
                    ) : null}
                  </div>
                  {lesson.lessonType === 'TEXT' && lesson.textContent && (
                    <div className="field__hint" style={{ maxWidth: 640, whiteSpace: 'pre-wrap' }}>
                      {String(lesson.textContent).slice(0, 180)}
                      {String(lesson.textContent).length > 180 ? '…' : ''}
                    </div>
                  )}
                  {(lesson.resources || []).length > 0 && (
                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }} className="field__hint">
                      {lesson.resources.map((r) => (
                        <li key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>
                            {r.title}
                            {r.resourceType ? ` (${r.resourceType})` : ''}
                          </span>
                          {can(P.RESOURCES_DELETE) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPendingDelete({ type: 'resource', id: r.id, lessonId: lesson.id, label: r.title })}
                            >
                              {t('education.deleteResource')}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="row">
                  {can(P.LESSONS_UPDATE) && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={ArrowUp}
                        disabled={lessonIndex === 0 || reorderLessons.isPending}
                        onClick={() => moveLesson(mod, lessonIndex, -1)}
                        aria-label={t('education.moveUp')}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={ArrowDown}
                        disabled={lessonIndex === (mod.lessons || []).length - 1 || reorderLessons.isPending}
                        onClick={() => moveLesson(mod, lessonIndex, 1)}
                        aria-label={t('education.moveDown')}
                      />
                    </>
                  )}
                  {can(P.RESOURCES_CREATE) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Paperclip}
                      onClick={() => setResourceModal({ lessonId: lesson.id, lessonTitle: lesson.title })}
                      aria-label={t('education.addResource')}
                    />
                  )}
                  {can(P.LESSONS_UPDATE) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Pencil}
                      onClick={() => setLessonModal({ moduleId: mod.id, lesson })}
                      aria-label={t('common.edit')}
                    />
                  )}
                  {can(P.LESSONS_DELETE) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => setPendingDelete({ type: 'lesson', id: lesson.id, label: lesson.title })}
                      aria-label={t('common.delete')}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Modal
        open={Boolean(moduleModal)}
        onClose={() => setModuleModal(null)}
        title={moduleModal?.id ? t('education.editModule') : t('education.createModule')}
        locked={saveModule.isPending}
      >
        <form className="stack-md" onSubmit={moduleForm.handleSubmit((v) => saveModule.mutate(v))}>
          <BilingualField form={moduleForm} name="title" label={t('education.moduleTitle')} required />
          <BilingualField form={moduleForm} name="description" label={t('education.description')} multiline rows={3} />
          <FormField label={t('education.status')}>
            <Select
              {...moduleForm.register('status')}
              options={['DRAFT', 'PUBLISHED'].map((v) => ({ value: v, label: t(`enums.curriculumStatus.${v}`, null, v) }))}
            />
          </FormField>
          <Checkbox label={t('education.required')} {...moduleForm.register('isRequired')} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setModuleModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saveModule.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(lessonModal)}
        onClose={() => setLessonModal(null)}
        title={lessonModal?.lesson ? t('education.editLesson') : t('education.addLesson')}
        size="lg"
        locked={saveLesson.isPending || uploadMedia.isPending}
      >
        <form className="stack-md" onSubmit={lessonForm.handleSubmit((v) => saveLesson.mutate(v))}>
          <BilingualField form={lessonForm} name="title" label={t('education.lessonTitle')} required />
          <BilingualField form={lessonForm} name="description" label={t('education.description')} multiline rows={2} />
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <FormField label={t('education.lessonType')}>
              <Select
                {...lessonForm.register('lessonType')}
                options={LESSON_TYPES.map((v) => ({ value: v, label: t(`enums.lessonType.${v}`, null, v) }))}
              />
            </FormField>
            <FormField label={t('education.status')}>
              <Select
                {...lessonForm.register('status')}
                options={['DRAFT', 'PUBLISHED'].map((v) => ({ value: v, label: t(`enums.curriculumStatus.${v}`, null, v) }))}
              />
            </FormField>
            <FormField label={t('education.durationMinutes')}>
              <TextInput type="number" min={1} {...lessonForm.register('estimatedDurationMinutes')} />
            </FormField>
          </div>
          <Checkbox label={t('education.required')} {...lessonForm.register('isRequired')} />

          {lessonType === 'TEXT' && (
            <BilingualField form={lessonForm} name="textContent" label={t('education.textContent')} required multiline rows={8} />
          )}

          {(lessonType === 'EXTERNAL_LINK' || lessonType === 'VIDEO') && (
            <FormField label={t('education.externalUrl')} error={lessonForm.formState.errors.externalUrl?.message}>
              <TextInput className="ltr" {...lessonForm.register('externalUrl')} placeholder="https://" />
            </FormField>
          )}

          {['VIDEO', 'DOCUMENT', 'AUDIO'].includes(lessonType) && (
            <>
              <FormField
                label={
                  lessonType === 'VIDEO'
                    ? t('education.videoMediaId')
                    : lessonType === 'DOCUMENT'
                      ? t('education.documentMediaId')
                      : t('education.audioMediaId')
                }
              >
                <TextInput
                  className="ltr"
                  {...lessonForm.register(
                    lessonType === 'VIDEO' ? 'videoMediaId' : lessonType === 'DOCUMENT' ? 'documentMediaId' : 'audioMediaId',
                  )}
                />
              </FormField>
              <FormField label={t('education.uploadMedia')}>
                <FileUploader
                  accept={accept}
                  maxMb={100}
                  file={uploadFile}
                  onSelect={setUploadFile}
                  progress={uploadProgress}
                  disabled={uploadMedia.isPending}
                />
                {uploadFile && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    style={{ marginTop: 8 }}
                    loading={uploadMedia.isPending}
                    onClick={() => uploadMedia.mutate({ file: uploadFile, category: mediaCategory })}
                  >
                    {t('education.uploadMedia')}
                  </Button>
                )}
              </FormField>
            </>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setLessonModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saveLesson.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resourceModal)}
        onClose={() => setResourceModal(null)}
        title={t('education.addResource')}
        locked={saveResource.isPending || uploadResourceMedia.isPending}
      >
        <form className="stack-md" onSubmit={resourceForm.handleSubmit((v) => saveResource.mutate(v))}>
          {resourceModal?.lessonTitle && <div className="field__hint">{resourceModal.lessonTitle}</div>}
          <BilingualField form={resourceForm} name="title" label={t('education.resourceTitle')} required />
          <FormField label={t('education.resourceType')}>
            <Select
              {...resourceForm.register('resourceType')}
              options={RESOURCE_TYPES.map((v) => ({ value: v, label: v }))}
            />
          </FormField>
          {resourceType === 'LINK' ? (
            <FormField label={t('education.externalUrl')}>
              <TextInput className="ltr" {...resourceForm.register('externalUrl')} placeholder="https://" />
            </FormField>
          ) : (
            <FormField label={t('education.uploadMedia')}>
              <FileUploader
                maxMb={50}
                file={resourceUploadFile}
                onSelect={setResourceUploadFile}
                progress={resourceUploadProgress}
                disabled={uploadResourceMedia.isPending}
              />
              {resourceUploadFile && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  style={{ marginTop: 8 }}
                  loading={uploadResourceMedia.isPending}
                  onClick={() => uploadResourceMedia.mutate({ file: resourceUploadFile })}
                >
                  {t('education.uploadMedia')}
                </Button>
              )}
              <TextInput className="ltr" style={{ marginTop: 8 }} {...resourceForm.register('mediaFileId')} placeholder="media UUID" />
            </FormField>
          )}
          <Checkbox label={t('education.isDownloadable')} {...resourceForm.register('isDownloadable')} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setResourceModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saveResource.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={
          pendingDelete?.type === 'module'
            ? t('education.deleteModule')
            : pendingDelete?.type === 'lesson'
              ? t('education.deleteLesson')
              : t('education.deleteResource')
        }
        body={pendingDelete?.label}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
