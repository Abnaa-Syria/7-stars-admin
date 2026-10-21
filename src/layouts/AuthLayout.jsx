import { Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { BrandMark, LanguageSwitch, ThemeSwitch } from '@/components/brand/BrandMark';
import { PoweredBy } from '@/components/brand/PoweredBy';

export default function AuthLayout() {
  const { t, locale } = useI18n();
  const { changeLanguage } = useAuth();

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__top">
          <span className="brand-admin-pill">{t('common.adminBadge')}</span>
          <div className="row" style={{ gap: 8 }}>
            <ThemeSwitch />
            <LanguageSwitch value={locale} onChange={changeLanguage} />
          </div>
        </div>
        <div className="auth__form-wrap">
          <div className="auth__form">
            <BrandMark variant="full" />
            <Outlet />
          </div>
        </div>
      </div>
      <PoweredBy />
    </div>
  );
}
