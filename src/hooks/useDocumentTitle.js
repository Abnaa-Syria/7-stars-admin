import { useEffect } from 'react';
import { useI18n } from '@/i18n';

export function useDocumentTitle(title) {
  const { t } = useI18n();
  useEffect(() => {
    document.title = title ? `${title} — ${t('common.appName')}` : t('common.appName');
  }, [title, t]);
}
