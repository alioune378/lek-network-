import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LIVE } from '@/lib/live';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/locales';
import Player from '@/components/Player';
import Cover from '@/components/Cover';
import Division from '@/components/Division';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'live' });
  return { title: t('title') };
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('live');
  const states = ['live', 'scheduled', 'replay', 'offline'] as const;

  return (
    <div className="dark-page">
      <div className="container page">
        <header className="page-head live-head">
          <div>
            <Division name="live" tone="dark" live={LIVE.status === 'live'} />
            <h1 className="page-title">{t('title')}</h1>
            <p className="page-intro">{t('intro')}</p>
          </div>
          <ul className="live-states" aria-label={t('title')}>
            {states.map((s) => (
              <li key={s} className={`live-state ${s === LIVE.status ? 'is-current' : ''} state-${s}`} aria-current={s === LIVE.status ? 'true' : undefined}>
                <span className="live-dot" aria-hidden="true" />
                {t(`status.${s}`)}
              </li>
            ))}
          </ul>
        </header>

        {LIVE.status === 'live' ? (
          <Player live src={LIVE.src} title={LIVE.title || t('title')} poster={<Cover pattern="rays" tone="night" seed="live" className="cover" />} />
        ) : (
          <div className="offline" role="status">
            <Cover pattern="rings" tone="night" seed="live-offline" className="cover offline-art" />
            <div className="offline-body">
              <span className="live-state state-offline is-current">
                <span className="live-dot" aria-hidden="true" />
                {t('status.offline')}
              </span>
              <h2 className="offline-title">{t('offlineTitle')}</h2>
              <p>{t('offlineText')}</p>
            </div>
          </div>
        )}
        <p className="player-note">{t('soundNote')}</p>

        <div className="live-cols">
          <section aria-labelledby="sched-h">
            <h2 id="sched-h" className="sub-title">
              {t('schedule')}
            </h2>
            {LIVE.schedule.length ? (
              <ol className="episodes">
                {LIVE.schedule.map((s, i) => (
                  <li key={i} className="episode">
                    <time className="episode-n" dateTime={s.start}>
                      {formatDate(s.start, locale, true)}
                    </time>
                    <span className="episode-title">{s.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-dark">{t('noSchedule')}</p>
            )}
          </section>
          <section aria-labelledby="rep-h">
            <h2 id="rep-h" className="sub-title">
              {t('replays')}
            </h2>
            {LIVE.replays.length ? null : <p className="empty-dark">{t('noReplays')}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
