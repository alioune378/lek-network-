import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CATEGORIES } from '@/lib/content';

export default function Footer() {
  const t = useTranslations();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/brand/lek-horizontal-light.svg" alt="LËK Network" width={1352} height={557} className="footer-logo" />
          <p className="footer-tag" lang="fr" dir="ltr">
            {t('meta.tagline')}
          </p>
          <p className="footer-about">{t('footer.about')}</p>
        </div>
        <nav aria-labelledby="ft-sections" className="footer-col">
          <h2 id="ft-sections" className="footer-k">
            {t('footer.sections')}
          </h2>
          <ul role="list">
            {CATEGORIES.filter((c) => c !== 'africa' && c !== 'diaspora')
              .slice(0, 5)
              .map((c) => (
                <li key={c}>
                  <Link href={`/category/${c}`}>{t(`categories.${c}`)}</Link>
                </li>
              ))}
            <li>
              <Link href="/regions">{t('nav.regions')}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="ft-network" className="footer-col">
          <h2 id="ft-network" className="footer-k">
            {t('footer.network')}
          </h2>
          <ul role="list">
            <li>
              <Link href="/watch">LËK Watch</Link>
            </li>
            <li>
              <Link href="/live">LËK Live</Link>
            </li>
            <li>
              <Link href="/originals">{t('nav.originals')}</Link>
            </li>
            <li>
              <Link href="/studios">LËK Studios</Link>
            </li>
            <li>
              <Link href="/region/africa">{t('nav.africa')}</Link>
            </li>
            <li>
              <Link href="/region/diaspora">{t('nav.diaspora')}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="ft-about" className="footer-col">
          <h2 id="ft-about" className="footer-k">
            {t('footer.institution')}
          </h2>
          <ul role="list">
            <li>
              <Link href="/standards">{t('nav.standards')}</Link>
            </li>
            <li>
              <Link href="/standards#contact">{t('nav.contact')}</Link>
            </li>
            <li>
              <Link href="/privacy">{t('nav.privacy')}</Link>
            </li>
            <li>
              <Link href="/credits">{t('nav.credits')}</Link>
            </li>
            <li>
              <Link href="/community">{t('nav.community')}</Link>
            </li>
            <li>
              <Link href="/feedback">{t('nav.feedback')}</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="container footer-base">
        <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
        <span>{t('footer.prototype')}</span>
        <span>
          {t('footer.tools')}{' '}
          <Link href="/newsroom" className="footer-tool">
            {t('nav.newsroom')}
          </Link>
        </span>
      </div>
    </footer>
  );
}
