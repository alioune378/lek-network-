import type { Locale } from './locales';

/** The suggestion is written in the suggested language, so the reader recognises it. */
export const SUGGEST: Record<Locale, { text: string; yes: string; no: string }> = {
  fr: { text: 'Lire LËK en français ?', yes: 'Oui, en français', no: 'Non merci' },
  en: { text: 'Read LËK in English?', yes: 'Yes, in English', no: 'No thanks' },
  ar: { text: 'هل تريد قراءة LËK بالعربية؟', yes: 'نعم، بالعربية', no: 'لا، شكرًا' },
  wo: { text: 'Jàng LËK ci wolof ? (làkk wi dafa ciy defar)', yes: 'Waaw, ci wolof', no: 'Déedéet' },
  es: { text: '¿Leer LËK en español?', yes: 'Sí, en español', no: 'No, gracias' },
  pt: { text: 'Ler o LËK em português?', yes: 'Sim, em português', no: 'Não, obrigado' },
  de: { text: 'LËK auf Deutsch lesen?', yes: 'Ja, auf Deutsch', no: 'Nein, danke' },
  it: { text: 'Leggere LËK in italiano?', yes: 'Sì, in italiano', no: 'No, grazie' },
  tr: { text: 'LËK’i Türkçe okumak ister misiniz?', yes: 'Evet, Türkçe', no: 'Hayır, teşekkürler' },
  zh: { text: '用中文阅读 LËK？', yes: '是，使用中文', no: '不用了' },
};

export const CHOICE_KEY = 'lek-lang-choice';
