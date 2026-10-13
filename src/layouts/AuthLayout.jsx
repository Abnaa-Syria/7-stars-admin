import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { BrandMark, LanguageSwitch, ThemeSwitch } from '@/components/brand/BrandMark';

export default function AuthLayout() {
  const { t, locale } = useI18n();
  const { changeLanguage } = useAuth();

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__top">
          <BrandMark />
          <div className="row" style={{ gap: 8 }}>
            <ThemeSwitch />
            <LanguageSwitch value={locale} onChange={changeLanguage} />
          </div>
        </div>
        <div className="auth__form-wrap">
          <div className="auth__form">
            <Outlet />
          </div>
        </div>
        <div className="auth__foot">
          <ShieldCheck size={14} />
          {t('auth.secureArea')}
        </div>
      </div>
    </div>
  );
}
