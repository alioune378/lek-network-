import { useTranslations } from 'next-intl';

/** Always visible on news pages while the platform runs on fictional content. */
export default function DemoBanner() {
  const t = useTranslations('common');
  return (
    <div className="demo-banner" role="note">
      <div className="container">
        <span className="demo-pill">{t('demo')}</span> {t('demoBanner')}
      </div>
    </div>
  );
}
