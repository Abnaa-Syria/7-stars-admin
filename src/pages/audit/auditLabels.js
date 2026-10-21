/** Localized audit action / entity labels, falling back to a readable phrase. */
export const auditActionLabel = (t, action) => t(`audit.actions.${action}`, null, humanizeKey(action));
export const auditEntityLabel = (t, entity) => t(`audit.entities.${entity}`, null, humanizeKey(entity));

const FIELD_I18N = {
  fullName: 'audit.fields.fullName',
  email: 'audit.fields.email',
  phone: 'audit.fields.phone',
  timezone: 'audit.fields.timezone',
  preferredLanguage: 'audit.fields.preferredLanguage',
  status: 'audit.fields.status',
  roles: 'audit.fields.roles',
  roleIds: 'audit.fields.roles',
  emailVerified: 'audit.fields.emailVerified',
  phoneVerified: 'audit.fields.phoneVerified',
  displayName: 'audit.fields.displayName',
  headline: 'audit.fields.headline',
  biography: 'audit.fields.biography',
  specialization: 'audit.fields.specialization',
  yearsOfExperience: 'audit.fields.yearsOfExperience',
  institution: 'audit.fields.institution',
  publicProfileSlug: 'audit.fields.publicProfileSlug',
  isPublic: 'audit.fields.isPublic',
  verificationStatus: 'audit.fields.verificationStatus',
  verificationNote: 'audit.fields.verificationNote',
  reason: 'audit.fields.reason',
  note: 'audit.fields.note',
  name: 'audit.fields.name',
  nameAr: 'audit.fields.nameAr',
  nameEn: 'audit.fields.nameEn',
  slug: 'audit.fields.slug',
  description: 'audit.fields.description',
  permissions: 'audit.fields.permissions',
  permissionIds: 'audit.fields.permissions',
  permissionSlugs: 'audit.fields.permissions',
  title: 'audit.fields.title',
  categoryId: 'audit.fields.category',
  teacherId: 'audit.fields.teacher',
  studentId: 'audit.fields.student',
  courseId: 'audit.fields.course',
  level: 'audit.fields.level',
  visibility: 'audit.fields.visibility',
  enrollmentMode: 'audit.fields.enrollmentMode',
  contentAccessMode: 'audit.fields.contentAccessMode',
  shortDescription: 'audit.fields.shortDescription',
  fullDescription: 'audit.fields.fullDescription',
  maxStudents: 'audit.fields.maxStudents',
  estimatedDurationMinutes: 'audit.fields.duration',
  coverMediaId: 'audit.fields.cover',
  originalName: 'audit.fields.fileName',
  mimeType: 'audit.fields.mimeType',
  sizeBytes: 'audit.fields.size',
  category: 'audit.fields.mediaCategory',
  key: 'audit.fields.settingKey',
  value: 'audit.fields.settingValue',
  group: 'audit.fields.settingGroup',
  revokedCount: 'audit.fields.revokedCount',
  initiatedBy: 'audit.fields.initiatedBy',
  settings: 'audit.fields.settings',
  changes: 'audit.fields.changes',
  avatarMediaId: 'audit.fields.avatar',
  profileImageId: 'audit.fields.profileImage',
  coverImageId: 'audit.fields.coverImage',
};

export function auditFieldLabel(t, key) {
  const mapped = FIELD_I18N[key];
  if (mapped) return t(mapped, null, key);
  return t(`audit.fields.${key}`, null, humanizeKey(key));
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function languageLabel(t, code) {
  if (!code) return null;
  const normalized = String(code).toLowerCase();
  if (normalized === 'ar' || normalized.startsWith('ar-')) return t('enums.language.ar');
  if (normalized === 'en' || normalized.startsWith('en-')) return t('enums.language.en');
  return code;
}

function statusLabel(t, value) {
  if (value == null || value === '') return null;
  return t(`enums.status.${value}`, null, t(`enums.verification.${value}`, null, String(value)));
}

function formatBytes(n) {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = num;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(i ? 1 : 0)} ${units[i]}`;
}

/** Formats a single audit field value into readable text. */
export function formatAuditValue(t, key, value) {
  if (value === null || value === undefined || value === '') return t('common.none');
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');

  if (key === 'preferredLanguage') return languageLabel(t, value) || String(value);
  if (key === 'status' || key === 'verificationStatus') return statusLabel(t, value) || String(value);
  if (key === 'sizeBytes') return formatBytes(value);
  if (key === 'ipAddress' || key === 'ip') {
    if (value === '::1' || value === '127.0.0.1') return t('audit.localhost');
    return String(value);
  }

  if (Array.isArray(value)) {
    if (!value.length) return t('common.none');
    return value
      .map((item) => {
        if (item == null) return t('common.none');
        if (typeof item === 'object') {
          return item.name || item.fullName || item.slug || item.title || item.id || JSON.stringify(item);
        }
        return String(item);
      })
      .join(t('common.listSep', null, '، '));
  }

  if (typeof value === 'object') {
    if (value.fullName || value.name || value.title || value.email) {
      return [value.fullName || value.name || value.title, value.email].filter(Boolean).join(' · ');
    }
    return null;
  }

  return String(value);
}

/** Flat list of { label, value } for DescriptionList from before/after/metadata objects. */
export function auditDataToItems(t, data) {
  if (data == null) return [];
  if (typeof data !== 'object' || Array.isArray(data)) {
    return [{ label: t('audit.value'), value: formatAuditValue(t, 'value', data) }];
  }

  return Object.entries(data)
    .filter(([key]) => !['password', 'passwordHash', 'token', 'refreshToken', 'secret'].includes(key))
    .map(([key, value]) => {
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        const nested = Object.entries(value)
          .map(([nk, nv]) => {
            const formatted = formatAuditValue(t, nk, nv);
            if (formatted == null && nv != null && typeof nv === 'object') {
              return `${auditFieldLabel(t, nk)}: …`;
            }
            return `${auditFieldLabel(t, nk)}: ${formatted ?? t('common.none')}`;
          })
          .join('\n');
        return { label: auditFieldLabel(t, key), value: nested || t('common.none') };
      }
      return {
        label: auditFieldLabel(t, key),
        value: formatAuditValue(t, key, value) ?? t('common.none'),
      };
    });
}

/** Short readable browser/OS from user-agent. */
export function formatUserAgent(t, ua) {
  if (!ua) return t('common.none');
  const str = String(ua);
  let browser = t('audit.browser.unknown');
  if (/Edg\//i.test(str)) browser = 'Edge';
  else if (/Chrome\//i.test(str) && !/Chromium/i.test(str)) browser = 'Chrome';
  else if (/Firefox\//i.test(str)) browser = 'Firefox';
  else if (/Safari\//i.test(str) && !/Chrome/i.test(str)) browser = 'Safari';

  let os = t('audit.browser.unknownOs');
  if (/Windows NT 10/i.test(str)) os = 'Windows 10/11';
  else if (/Windows/i.test(str)) os = 'Windows';
  else if (/Mac OS X/i.test(str)) os = 'macOS';
  else if (/Android/i.test(str)) os = 'Android';
  else if (/iPhone|iPad/i.test(str)) os = 'iOS';
  else if (/Linux/i.test(str)) os = 'Linux';

  return t('audit.browser.summary', { browser, os }, `${browser} · ${os}`);
}
