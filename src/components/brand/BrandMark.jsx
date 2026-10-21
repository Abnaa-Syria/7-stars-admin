import { Moon, Star, Sun } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { usePublicSettings } from '@/hooks/usePublicSettings';

/** Logo from branding settings when configured, otherwise the gold star mark. */
export function BrandMark({ showText = true }) {
  const { t } = useI18n();
  const { logoUrl, platformName } = usePublicSettings();
  return (
    <>
      <span className="brand-mark">{logoUrl ? <img src={logoUrl} alt="" /> : <Star size={20} fill="currentColor" />}</span>
      {showText && (
        <span className="brand-text">
          <span className="brand-text__name ltr" dir="ltr">
            {platformName || t('common.appName')}
          </span>
          <span className="brand-text__sub">{t('common.adminPanel')}</span>
        </span>
      )}
    </>
  );
}

export function LanguageSwitch({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('theme.language')}>
      <button type="button" className={value === 'ar' ? 'active' : undefined} onClick={() => onChange('ar')} lang="ar">
        AR
      </button>
      <button type="button" className={value === 'en' ? 'active' : undefined} onClick={() => onChange('en')} lang="en">
        EN
      </button>
    </div>
  );
}

/** Toggles between light and dark. */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { mode, toggleMode } = useTheme();
  const Icon = mode === 'dark' ? Moon : Sun;
  return (
    <button
      type="button"
      className="theme-switch"
      onClick={toggleMode}
      title={t(`theme.${mode}`)}
      aria-label={t('theme.toggle', { mode: t(`theme.${mode}`) })}
    >
      <Icon size={17} />
    </button>
  );
}
