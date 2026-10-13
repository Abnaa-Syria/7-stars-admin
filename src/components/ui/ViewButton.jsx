import { Eye } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from './Button';

/** Consistent “view details” control for table action columns. */
export function ViewButton({ onClick, to, label, ...rest }) {
  const { t } = useI18n();
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={Eye}
      to={to}
      aria-label={label || t('common.view')}
      title={label || t('common.view')}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick(e);
            }
          : undefined
      }
      {...rest}
    />
  );
}
