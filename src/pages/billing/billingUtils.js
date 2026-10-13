/** Shared helpers for Phase 4 billing UI. */

export const STATUS_TONE = {
  ACTIVE: 'success',
  TRIALING: 'info',
  PAST_DUE: 'warning',
  GRACE_PERIOD: 'warning',
  CANCELED: 'muted',
  EXPIRED: 'muted',
  INCOMPLETE: 'warning',
  SUSPENDED: 'danger',
  INACTIVE: 'muted',
  ARCHIVED: 'warning',
  PENDING: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  REFUNDED: 'muted',
  PARTIALLY_REFUNDED: 'warning',
  DRAFT: 'muted',
  OPEN: 'info',
  PAID: 'success',
  VOID: 'muted',
  UNCOLLECTIBLE: 'danger',
  RECEIVED: 'info',
  PROCESSING: 'warning',
  PROCESSED: 'success',
  IGNORED: 'muted',
  SENT: 'success',
  DELIVERED: 'success',
  SKIPPED: 'muted',
  SCHEDULED: 'info',
  SENDING: 'warning',
  REVOKED: 'muted',
  INVALID: 'danger',
};

export function pickPlanName(plan, locale) {
  if (!plan) return '—';
  return locale === 'ar' ? (plan.nameAr || plan.nameEn || plan.code) : (plan.nameEn || plan.nameAr || plan.code);
}

export function priceByInterval(prices = [], interval) {
  return (prices || []).find((p) => p.billingInterval === interval && p.status === 'ACTIVE')
    || (prices || []).find((p) => p.billingInterval === interval)
    || null;
}

export function formatMoney(amountMinor, currency = 'SAR', locale = 'en') {
  if (amountMinor == null) return '—';
  const amount = Number(amountMinor) / 100;
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency || 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || ''}`.trim();
  }
}

export function maskToken(token) {
  if (!token) return '—';
  if (token.includes('…') || token.includes('****')) return token;
  if (token.length < 10) return '****';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export const ENTITLEMENT_DEFS = [
  { key: 'courses.active.max', valueType: 'INTEGER', labelKey: 'phase4.ent.activeCourses' },
  { key: 'students.total.max', valueType: 'INTEGER', labelKey: 'phase4.ent.studentLimit' },
  { key: 'storage.bytes.max', valueType: 'INTEGER', labelKey: 'phase4.ent.storageLimit' },
  { key: 'quiz.advanced.enabled', valueType: 'BOOLEAN', labelKey: 'phase4.ent.advancedQuizzes' },
  { key: 'analytics.advanced.enabled', valueType: 'BOOLEAN', labelKey: 'phase4.ent.advancedAnalytics' },
  { key: 'reports.export.enabled', valueType: 'BOOLEAN', labelKey: 'phase4.ent.reportExport' },
  { key: 'custom_branding.enabled', valueType: 'BOOLEAN', labelKey: 'phase4.ent.premiumFeatures' },
];
