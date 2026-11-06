import '../globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter_Tight, Newsreader, Noto_Naskh_Arabic, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { dirOf, locales, type Locale } from '@/lib/locales';
import { siteUrl } from '@/lib/format';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LangSuggest from '@/components/LangSuggest';

const serif = Newsreader({ subsets: ['latin', 'latin-ext'], variable: '--font-serif', display: 'swap', style: ['normal', 'italic'] });
const sans = Inter_Tight({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
// Arabic faces are declared without preload: they download only on Arabic pages, where they are used.
const arSerif = Noto_Naskh_Arabic({ subsets: ['arabic'], variable: '--font-ar-serif', display: 'swap', preload: false, weight: ['400', '600', '700'] });
const arSans = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], variable: '--font-ar-sans', display: 'swap', preload: false, weight: ['400', '500', '600', '700'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: `%s · LËK Info` },
    description: t('description'),
    alternates: { canonical: `/${locale}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    icons: { icon: '/favicon.ico', apple: '/brand/lek-info/lek-info-icon-light.png' },
    openGraph: { siteName: 'LËK Info', type: 'website', locale, images: ['/brand/lek-info/lek-info-icon-light.png'] },
    // Prototype: keep search engines away until real journalism is published.
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const l = locale as Locale;
  const fontVars = [serif.variable, sans.variable, l === 'ar' ? `${arSerif.variable} ${arSans.variable}` : ''].join(' ');
  return (
    <html lang={l} dir={dirOf(l)} className={fontVars}>
      <body>
        <NextIntlClientProvider locale={l} messages={messages}>
          <Header locale={l} />
          <LangSuggest locale={l} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
