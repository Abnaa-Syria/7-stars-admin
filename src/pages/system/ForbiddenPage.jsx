import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, Card, EmptyState } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ForbiddenPage() {
  const { t } = useI18n();
  useDocumentTitle(t('errors.forbiddenTitle'));
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title={t('errors.forbiddenTitle')}
        body={t('errors.forbiddenBody')}
        action={
          <Button variant="gold-outline" to="/dashboard">
            {t('errors.goHome')}
          </Button>
        }
      />
    </Card>
  );
}
