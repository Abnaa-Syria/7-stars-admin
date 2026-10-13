import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { Avatar } from './Avatar';

const MIME_LABELS = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF', 'application/pdf': 'PDF' };

/** Client-side pre-check only; the API re-validates type (magic bytes) and size. */
export function validateFile(file, { accept = [], maxMb }, t) {
  if (accept.length && !accept.includes(file.type)) return t('upload.invalidType', { types: accept.map((m) => MIME_LABELS[m] || m).join(', ') });
  if (maxMb && file.size > maxMb * 1024 * 1024) return t('upload.tooLarge', { size: maxMb });
  return null;
}

/** Drag & drop single-file picker with preview and optional upload progress (0–100). */
export function FileUploader({ accept = [], maxMb, file, onSelect, progress, disabled, error }) {
  const { t, formatBytes } = useI18n();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState(null);
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    if (!f) return;
    const problem = validateFile(f, { accept, maxMb }, t);
    setLocalError(problem);
    onSelect(problem ? null : f);
  };

  const hint = t('media.allowed', { types: accept.map((m) => MIME_LABELS[m] || m).join(', ') || '—', size: maxMb ?? '—' });

  return (
    <div className="stack-sm">
      {file ? (
        <div className="dropzone__file">
          {preview ? <img src={preview} alt="" className="dropzone__thumb" /> : <span className="dropzone__thumb" style={{ display: 'grid', placeItems: 'center' }}><FileText size={22} /></span>}
          <div className="grow">
            <div className="truncate" style={{ fontWeight: 700 }}>
              {file.name}
            </div>
            <div className="field__hint">
              {formatBytes(file.size)} · {MIME_LABELS[file.type] || file.type}
            </div>
            {progress !== undefined && progress !== null && (
              <div className="progress" style={{ marginTop: 8 }}>
                <div className="progress__bar" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onSelect(null)} disabled={disabled} aria-label={t('common.remove')} />
        </div>
      ) : (
        <div
          className={clsx('dropzone', drag && 'dropzone--active')}
          role="button"
          tabIndex={0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (!disabled) pick(e.dataTransfer.files?.[0]);
          }}
        >
          <UploadCloud size={30} />
          <strong style={{ color: 'var(--text)' }}>{t('media.dropHint')}</strong>
          <span className="field__hint">{hint}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept.join(',')}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {(localError || error) && <span className="field__error">{localError || error}</span>}
    </div>
  );
}

/** Circular avatar picker that uploads immediately through `onUpload(file)`. */
export function AvatarUploader({ src, name, onUpload, onRemove, loading, accept = ['image/jpeg', 'image/png', 'image/webp'], maxMb }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  return (
    <div className="stack-sm">
      <div className="avatar-uploader">
        <Avatar src={src} name={name} size={84} />
        <div className="stack-sm">
          <div className="row wrap">
            <Button size="sm" variant="gold-outline" icon={UploadCloud} loading={loading} onClick={() => inputRef.current?.click()}>
              {src ? t('upload.replace') : t('upload.choose')}
            </Button>
            {src && onRemove && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={onRemove} disabled={loading}>
                {t('common.remove')}
              </Button>
            )}
          </div>
          <span className="field__hint">{t('upload.avatarHint')}</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept.join(',')}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const problem = validateFile(f, { accept, maxMb }, t);
          setError(problem);
          if (!problem) onUpload(f);
        }}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
