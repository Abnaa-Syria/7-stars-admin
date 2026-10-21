import { useI18n } from '@/i18n';

export function PoweredBy() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="site-foot">
      <p className="site-foot__copy">
        © {year} {t('common.appName')}. {t('common.allRightsReserved')}
      </p>
      <p className="site-foot__brand">
        <span className="site-foot__label">{t('common.poweredBy')}</span>
        <a className="site-foot__vendor" href="https://triasols.com/" target="_blank" rel="noopener noreferrer" dir="ltr">
          {t('common.vendorName')}
        </a>
      </p>
    </footer>
  );
}
