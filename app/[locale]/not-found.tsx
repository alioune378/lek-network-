import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('common');
  return (
    <div className="container nf">
      <p className="eyebrow">404</p>
      <h1 className="page-title">{t('notFound')}</h1>
      <p className="page-intro">{t('notFoundText')}</p>
      <Link className="btn" href="/">
        {t('home')}
      </Link>
    </div>
  );
}
