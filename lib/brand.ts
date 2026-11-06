/**
 * LËK brand architecture (confirmed by the founder, 2026-11-05).
 *   LËK Network     — the parent company (group). Owns the motto "Toujours un temps d’avance."
 *   LËK Info        — this site: the news publication, including Watch, Live, Originals, articles, regions and LËK Community.
 *   LËK Media       — future entertainment, culture and digital programming division (not launched).
 *   LËK Productions — future professional production division: documentaries, film, commercial work (not launched).
 * One place for names and logo paths, so the next renames are one-line changes.
 */
export const PUBLICATION = 'LËK Info';
export const PARENT = 'LËK Network';
export const MOTTO = 'Toujours un temps d’avance.';

export type Division = 'info' | 'media' | 'productions';
/** The division this website serves. Content assigned to another division is not listed here. */
export const SITE_DIVISION: Division = 'info';

export const DIVISIONS: Record<Division, { name: string; status: 'live' | 'planned' }> = {
  info: { name: 'LËK Info', status: 'live' },
  media: { name: 'LËK Media', status: 'planned' },
  productions: { name: 'LËK Productions', status: 'planned' },
};

/**
 * Logo files from the founder's LËK Info package (public/brand/lek-info). "-web" files are the same artwork with the
 * empty canvas margin trimmed (viewBox only). Package naming: "light" = for light backgrounds (navy lettering),
 * "dark" = for dark backgrounds (white lettering).
 */
export const LOGO = {
  horizontalOnLight: { src: '/brand/lek-info/lek-info-horizontal-light-web.svg', width: 976, height: 382 },
  horizontalOnDark: { src: '/brand/lek-info/lek-info-horizontal-dark-web.svg', width: 976, height: 382 },
  stackedOnLight: { src: '/brand/lek-info/lek-info-stacked-light-web.svg', width: 524, height: 842 },
  stackedOnDark: { src: '/brand/lek-info/lek-info-stacked-dark-web.svg', width: 524, height: 842 },
  icon: '/brand/lek-info/lek-info-icon-light.png',
};
