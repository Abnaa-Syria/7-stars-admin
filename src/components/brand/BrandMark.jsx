import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { usePublicSettings } from '@/hooks/usePublicSettings';

const OFFICIAL = {
  full: '/brand/logo.png',
  wide: '/brand/logo-wide.png',
  mark: '/brand/logo.png',
};

/** Official Seven Stars lockup. Settings logo overrides when uploaded. */
export function BrandMark({ showText = false, variant = 'wide' }) {
  const { t } = useI18n();
  const { logoUrl, platformName } = usePublicSettings();
  const src = logoUrl || OFFICIAL[variant] || OFFICIAL.wide;
  const label = platformName || t('common.appName');

  return (
    <span className={`brand-lockup brand-lockup--${variant}`}>
      <img className="brand-lockup__img" src={src} alt={label} />
      {showText && !logoUrl && variant === 'mark' && (
        <span className="brand-text">
          <span className="brand-text__name ltr" dir="ltr">
            {label}
          </span>
        </span>
      )}
    </span>
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
