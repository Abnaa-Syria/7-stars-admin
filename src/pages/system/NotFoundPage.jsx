import { Compass } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, Card, EmptyState } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(t('errors.notFoundTitle'));
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title={t('errors.notFoundTitle')}
        body={t('errors.notFoundBody')}
        action={
          <Button variant="gold-outline" to="/dashboard">
            {t('errors.goHome')}
          </Button>
        }
      />
    </Card>
  );
}
