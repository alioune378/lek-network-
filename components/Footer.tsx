import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CATEGORIES } from '@/lib/content';

export default function Footer() {
  const t = useTranslations();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/brand/lek-horizontal-light.svg" alt="LËK Network" width={1440} height={480} className="footer-logo" />
          <p className="footer-tag">{t('meta.tagline')}</p>
          <p className="footer-about">{t('footer.about')}</p>
        </div>
        <nav aria-label={t('footer.sections')}>
          <p className="footer-k">{t('footer.sections')}</p>
          <ul>
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c}>
                <Link href={`/category/${c}`}>{t(`categories.${c}`)}</Link>
              </li>
            ))}
            <li>
              <Link href="/regions">{t('nav.regions')}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t('footer.network')}>
          <p className="footer-k">{t('footer.network')}</p>
          <ul>
            <li>
              <Link href="/watch">{t('nav.watch')}</Link>
            </li>
            <li>
              <Link href="/live">{t('nav.live')}</Link>
            </li>
            <li>
              <Link href="/originals">{t('nav.originals')}</Link>
            </li>
            <li>
              <Link href="/studios">LËK Studios</Link>
            </li>
            <li>
              <Link href="/standards">{t('nav.standards')}</Link>
            </li>
            <li>
              <Link href="/newsroom">{t('nav.newsroom')}</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="container footer-base">
        <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
        <span>{t('footer.prototype')}</span>
      </div>
    </footer>
  );
}
