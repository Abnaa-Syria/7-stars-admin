import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { useI18n } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';

/** Public branding settings (platform name, logo, primary color). */
export function usePublicSettings() {
  const { locale } = useI18n();
  const { isDark } = useTheme();
  const query = useQuery({
    queryKey: queryKeys.publicSettings,
    queryFn: () => settingsApi.public().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const s = query.data || {};
  const lightLogo = s['branding.logoMediaId']?.url || null;
  const darkLogo = s['branding.logoDarkMediaId']?.url || null;
  return {
    ...query,
    platformName: (locale === 'en' ? s['general.platformNameEn'] : s['general.platformNameAr']) || null,
    logoUrl: isDark ? darkLogo || lightLogo : lightLogo || darkLogo,
    loginBackgroundUrl: s['branding.loginBackgroundMediaId']?.url || null,
    primaryColor: s['branding.primaryColor'] || null,
    passwordMinLength: s['security.passwordMinLength'] || 8,
    maxUploadSizeMb: s['media.maxUploadSizeMb'],
    allowedMimeTypes: s['media.allowedMimeTypes'] || [],
  };
}
