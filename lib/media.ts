/**
 * LËK Network — photo library (prototype).
 *
 * Every photograph comes from Wikimedia Commons under a free licence (CC0, CC BY, CC BY-SA or public domain),
 * selected by scripts/media (search + licence filter, AI-generated files excluded) and reviewed by eye.
 * They are ILLUSTRATIONS of places and everyday life. None documents the fictional stories they accompany,
 * and every caption says so. Credits and licence links are shown under each image and on /credits.
 */
import type { Locale } from './locales';

type L3 = { fr: string; en: string; ar: string };

export type Photo = {
  id: string;
  w: number;
  h: number;
  /** Widths generated in /public/media/photos (`${id}-${w}.webp`). */
  sizes: number[];
  /** CSS object-position, so portrait images crop on their subject. */
  pos?: string;
  alt: L3;
  /** Where and what, stated factually. */
  place: L3;
  author: string;
  year: string;
  license: string;
  licenseUrl?: string;
  source: string;
  /** Archival image (shown with an "archive" label). */
  archive?: boolean;
};

/** Captions in fr/en/ar; other locales fall back to English, Wolof to French (same rule as the interface). */
export const ptx = (v: L3, locale: Locale) => (locale === 'fr' || locale === 'wo' ? v.fr : locale === 'ar' ? v.ar : v.en);

const BY2 = 'https://creativecommons.org/licenses/by/2.0/';
const BY3 = 'https://creativecommons.org/licenses/by/3.0/';
const BY4 = 'https://creativecommons.org/licenses/by/4.0/';
const SA2 = 'https://creativecommons.org/licenses/by-sa/2.0/';
const SA4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const C = 'https://commons.wikimedia.org/wiki/File:';
const ALL = [640, 1200, 1800];

export const PHOTOS: Record<string, Photo> = {
  'dakar-aerial': {
    id: 'dakar-aerial', w: 1920, h: 1169, sizes: ALL,
    alt: { fr: 'Vue aérienne de Dakar, de la côte vers la Médina et Point E', en: 'Aerial view of Dakar, from the coast towards Medina and Point E', ar: 'منظر جوي لداكار من الساحل نحو المدينة القديمة وبوان إي' },
    place: { fr: 'Dakar, vue cerf-volant vers la Médina', en: 'Dakar, kite view towards Medina', ar: 'داكار، منظر من طائرة ورقية نحو المدينة' },
    author: 'Jeff Attaway', year: '2010', license: 'CC BY 2.0', licenseUrl: BY2, source: `${C}Dakar_Senegal_-_Looking_North_(5274051599).jpg`,
  },
  'car-rapide': {
    id: 'car-rapide', w: 1920, h: 1252, sizes: ALL,
    alt: { fr: 'Un car rapide peint aux couleurs vives dans une rue de Dakar', en: 'A brightly painted car rapide minibus in a Dakar street', ar: 'حافلة «كار رابيد» ملوّنة في أحد شوارع داكار' },
    place: { fr: 'Car rapide, Dakar', en: 'Car rapide, Dakar', ar: 'كار رابيد، داكار' },
    author: 'Ewien van Bergeijk-Kwant', year: '2015', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Blessed_Journey.jpg`,
  },
  'corniche-runners': {
    id: 'corniche-runners', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Des coureurs sur la corniche de Dakar au crépuscule, sous les palmiers', en: 'Runners on the Dakar Corniche at dusk, under palm trees', ar: 'عدّاؤون على كورنيش داكار عند الغسق تحت النخيل' },
    place: { fr: 'Corniche de Dakar, en fin de journée', en: 'Dakar Corniche, early evening', ar: 'كورنيش داكار، في آخر النهار' },
    author: 'Kateryna Serdiuk', year: '2019', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Runners_by_Serdiuk.jpg`,
  },
  'corniche-sunset': {
    id: 'corniche-sunset', w: 1920, h: 1280, sizes: ALL,
    alt: { fr: 'Coucher de soleil sur l’océan depuis la corniche de Dakar', en: 'Sunset over the ocean from the Dakar Corniche', ar: 'غروب الشمس على المحيط من كورنيش داكار' },
    place: { fr: 'Corniche de Dakar', en: 'Dakar Corniche', ar: 'كورنيش داكار' },
    author: 'Issiaga Photography', year: '2023', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Beautiful_sunset_dakar_corniche.jpg`,
  },
  'thies-market': {
    id: 'thies-market', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Une rue commerçante du marché de Thiès, étals et passants', en: 'A street in Thiès market, with stalls and passers-by', ar: 'شارع تجاري في سوق تييس، بسطات ومارّة' },
    place: { fr: 'Marché de Thiès', en: 'Thiès market', ar: 'سوق تييس' },
    author: 'GastelEtzwane', year: '2016', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}March%C3%A9_de_Thi%C3%A8s.jpg`,
  },
  'thies-station': {
    id: 'thies-station', w: 1280, h: 874, sizes: [640, 1200],
    alt: { fr: 'La gare ferroviaire de Thiès et ses voies', en: 'Thiès railway station and its tracks', ar: 'محطة قطار تييس وسككها' },
    place: { fr: 'Gare de Thiès', en: 'Thiès railway station', ar: 'محطة تييس' },
    author: 'Babacar Dioum', year: '2020', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}La_gare_de_Thi%C3%A8s.jpg`,
  },
  'saint-louis-bridge': {
    id: 'saint-louis-bridge', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Le pont Faidherbe à Saint-Louis, à contre-jour sur le fleuve', en: 'The Faidherbe bridge in Saint-Louis, backlit over the river', ar: 'جسر فيدرب في سان لويس، في مواجهة الضوء فوق النهر' },
    place: { fr: 'Pont Faidherbe, Saint-Louis', en: 'Faidherbe bridge, Saint-Louis', ar: 'جسر فيدرب، سان لويس' },
    author: 'Gregor Rom', year: '2017', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Pont_Faidherbe_Saint_Louis.jpg`,
  },
  'saint-louis-sor': {
    id: 'saint-louis-sor', w: 1920, h: 1441, sizes: ALL,
    alt: { fr: 'Le pont Faidherbe reliant Sor à l’île de Ndar', en: 'The Faidherbe bridge linking Sor to Ndar island', ar: 'جسر فيدرب الذي يربط سور بجزيرة اندار' },
    place: { fr: 'Saint-Louis, entre Sor et Ndar', en: 'Saint-Louis, between Sor and Ndar', ar: 'سان لويس، بين سور واندار' },
    author: 'Issathiome', year: '2025', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Pont_Faidherbe_connecting_Sor_to_Ndar_in_Saint_Louis.jpg`,
  },
  sabar: {
    id: 'sabar', w: 1920, h: 2560, sizes: ALL, pos: '50% 62%',
    alt: { fr: 'Des batteurs de sabar jouent sur le sable au soleil couchant', en: 'Sabar drummers playing on the sand at sunset', ar: 'عازفو طبول السابار على الرمل عند الغروب' },
    place: { fr: 'Batteurs de sabar', en: 'Sabar drummers', ar: 'عازفو السابار' },
    author: 'Wuzyprod', year: '2026', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Batteurs_de_sabar_13.jpg`,
  },
  'touba-mosque': {
    id: 'touba-mosque', w: 1920, h: 2556, sizes: ALL, pos: '50% 38%',
    alt: { fr: 'Les minarets de la Grande Mosquée de Touba vus sous une arcade', en: 'The minarets of the Great Mosque of Touba seen through an archway', ar: 'مآذن الجامع الكبير في طوبى من تحت قوس' },
    place: { fr: 'Grande Mosquée de Touba', en: 'Great Mosque of Touba', ar: 'الجامع الكبير في طوبى' },
    author: 'Issathiome', year: '2025', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}The_Grande_Mosqu%C3%A9e_de_Touba.jpg`,
  },
  'casamance-rice': {
    id: 'casamance-rice', w: 1417, h: 944, sizes: [640, 1200],
    alt: { fr: 'Récolte du riz à Boucotte, en Casamance', en: 'Rice harvest in Boucotte, Casamance', ar: 'حصاد الأرز في بوكوت، كازامانس' },
    place: { fr: 'Boucotte, Casamance', en: 'Boucotte, Casamance', ar: 'بوكوت، كازامانس' },
    author: 'Olivier Epron', year: '2007', license: 'CC BY 3.0', licenseUrl: BY3, source: `${C}R%C3%A9colte_riz_boucotte.jpg`,
  },
  'ziguinchor-pirogues': {
    id: 'ziguinchor-pirogues', w: 1920, h: 1280, sizes: ALL,
    alt: { fr: 'Pirogues sur la rive devant le pont de la Casamance à Ziguinchor', en: 'Pirogues on the bank before the Casamance bridge in Ziguinchor', ar: 'زوارق على الضفة أمام جسر كازامانس في زيغينشور' },
    place: { fr: 'Ziguinchor, fleuve Casamance', en: 'Ziguinchor, Casamance river', ar: 'زيغينشور، نهر كازامانس' },
    author: 'GuillaumeG', year: '2016', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Zig_7732.jpg`,
  },
  'laamb-dialaw': {
    id: 'laamb-dialaw', w: 1920, h: 2880, sizes: ALL, pos: '50% 55%',
    alt: { fr: 'Deux jeunes lutteurs au sol, entourés d’un public nombreux', en: 'Two young wrestlers on the sand, surrounded by a large crowd', ar: 'مصارعان شابان على الرمل يحيط بهما جمهور كبير' },
    place: { fr: 'Lutte au festival de Dialaw', en: 'Wrestling at the Dialaw festival', ar: 'مصارعة في مهرجان ديالاو' },
    author: 'Ibrahima Xaalil Ndiaye', year: '2026', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Jeune_Lutteur_du_Dialaw_Festival_20.jpg`,
  },
  'kaolack-market-1900': {
    id: 'kaolack-market-1900', w: 1628, h: 1042, sizes: [640, 1200], archive: true,
    alt: { fr: 'Carte postale ancienne du marché de Kaolack, début du XXe siècle', en: 'Early 20th-century postcard of Kaolack market', ar: 'بطاقة بريدية قديمة لسوق كاولاك، مطلع القرن العشرين' },
    place: { fr: 'Marché de Kaolack, carte postale ancienne', en: 'Kaolack market, early postcard', ar: 'سوق كاولاك، بطاقة بريدية قديمة' },
    author: 'Edmond Fortier', year: 'c. 1900–1910', license: 'Public domain', source: `${C}March%C3%A9_de_Kaolack_(AOF).jpg`,
  },
  'tambacounda-station': {
    id: 'tambacounda-station', w: 1920, h: 1431, sizes: ALL,
    alt: { fr: 'La gare de Tambacounda, façade au nom de la ville', en: 'Tambacounda railway station, with the town’s name on its façade', ar: 'محطة تامباكوندا واسم المدينة على واجهتها' },
    place: { fr: 'Gare de Tambacounda', en: 'Tambacounda station', ar: 'محطة تامباكوندا' },
    author: 'Niels Broekzitter', year: '2009', license: 'CC BY 2.0', licenseUrl: BY2, source: `${C}Niels_Broekzitter,_2009.jpg`,
  },
  'abidjan-plateau': {
    id: 'abidjan-plateau', w: 1920, h: 907, sizes: ALL,
    alt: { fr: 'Le Plateau d’Abidjan de nuit, vu depuis le pont Alassane-Ouattara', en: 'Abidjan’s Plateau at night, seen from the Alassane Ouattara bridge', ar: 'حي بلاتو في أبيدجان ليلاً من جسر الحسن واتارا' },
    place: { fr: 'Abidjan, Côte d’Ivoire', en: 'Abidjan, Côte d’Ivoire', ar: 'أبيدجان، كوت ديفوار' },
    author: 'Edison McCullen', year: '2026', license: 'CC BY 4.0', licenseUrl: BY4, source: `${C}Le_Plateau_depuis_le_Pont_ADO_%E2%80%93_Abidjan.jpg`,
  },
  'harlem-116': {
    id: 'harlem-116', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'La 116e Rue à Harlem, quartier surnommé « Little Senegal », devant une mosquée ouest-africaine', en: '116th Street in Harlem, known as “Little Senegal”, outside a West African mosque', ar: 'الشارع 116 في هارلم، المعروف بـ«السنغال الصغيرة»، أمام مسجد لجالية غرب أفريقيا' },
    place: { fr: 'Harlem, New York', en: 'Harlem, New York', ar: 'هارلم، نيويورك' },
    author: 'greenpointlife (Flickr)', year: '2005', license: 'CC BY-SA 2.0', licenseUrl: SA2, source: `${C}Masjid_aqsa_-_NOI_mosque.jpg`,
  },
  'dakar-port': {
    id: 'dakar-port', w: 1920, h: 1434, sizes: ALL,
    alt: { fr: 'Le port de commerce de Dakar et les immeubles du Plateau', en: 'Dakar’s commercial port and the buildings of the Plateau', ar: 'الميناء التجاري في داكار ومباني البلاتو' },
    place: { fr: 'Port de Dakar', en: 'Port of Dakar', ar: 'ميناء داكار' },
    author: 'Zarbialavi', year: '2011', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Dakar_Le_port_de_commerce.jpg`,
  },
  'dakar-harbour-aerial': {
    id: 'dakar-harbour-aerial', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Vue aérienne de la presqu’île de Dakar et de son port', en: 'Aerial view of the Dakar peninsula and its port', ar: 'منظر جوي لشبه جزيرة داكار ومينائها' },
    place: { fr: 'Presqu’île de Dakar, vue aérienne', en: 'Dakar peninsula from the air', ar: 'شبه جزيرة داكار من الجو' },
    author: 'KaBa', year: '2007', license: 'CC BY 3.0', licenseUrl: BY3, source: `${C}DakarHarbourAerial.JPG`,
  },
  'lac-rose': {
    id: 'lac-rose', w: 1920, h: 934, sizes: ALL,
    alt: { fr: 'Pirogues colorées au bord du lac Rose', en: 'Painted pirogues on the shore of Lac Rose', ar: 'زوارق ملوّنة على ضفة البحيرة الوردية' },
    place: { fr: 'Lac Rose (lac Retba)', en: 'Lac Rose (Lake Retba)', ar: 'البحيرة الوردية (ريتبا)' },
    author: 'Abrahami', year: '2018', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Lac_rose_au_S%C3%A9n%C3%A9gal.jpg`,
  },
  goree: {
    id: 'goree', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Les maisons colorées de l’île de Gorée vues depuis l’océan', en: 'The colourful houses of Gorée island seen from the ocean', ar: 'بيوت جزيرة غوريه الملوّنة من جهة المحيط' },
    place: { fr: 'Île de Gorée', en: 'Gorée island', ar: 'جزيرة غوريه' },
    author: 'Fawaz Tairou', year: '2022', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}C%C3%B4tes_de_l%27%C3%AEle_de_Gor%C3%A9e_au_S%C3%A9n%C3%A9gal_11.jpg`,
  },
  'ter-dakar': {
    id: 'ter-dakar', w: 1920, h: 1440, sizes: ALL,
    alt: { fr: 'Deux rames du Train Express Régional à quai', en: 'Two Regional Express Train sets at the platform', ar: 'قطاران من القطار السريع الإقليمي على الرصيف' },
    place: { fr: 'Train Express Régional, Dakar', en: 'Regional Express Train, Dakar', ar: 'القطار السريع الإقليمي، داكار' },
    author: 'Pamgueye', year: '2021', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Train_Express_R%C3%A9gional_de_Dakar.jpg`,
  },
  'film-set': {
    id: 'film-set', w: 1920, h: 2880, sizes: ALL, pos: '50% 42%',
    alt: { fr: 'Un opérateur règle une caméra de cinéma sur un tournage', en: 'A camera operator adjusting a cinema camera on set', ar: 'مصوّر يضبط كاميرا سينمائية أثناء التصوير' },
    place: { fr: 'Sur un tournage', en: 'On a film set', ar: 'في موقع تصوير' },
    author: 'Berbeture', year: '2017', license: 'CC BY-SA 4.0', licenseUrl: SA4, source: `${C}Directors_shot.jpg`,
  },
};

export const photo = (id?: string) => (id ? PHOTOS[id] : undefined);
export const srcSet = (p: Photo) => p.sizes.map((w) => `/media/photos/${p.id}-${w}.webp ${Math.min(w, p.w)}w`).join(', ');
export const src = (p: Photo, w = 1200) => `/media/photos/${p.id}-${p.sizes.includes(w) ? w : p.sizes[p.sizes.length - 1]}.webp`;

/** Photos for the regional pages and homepage regional section. */
export const REGION_PHOTO: Record<string, string> = {
  dakar: 'car-rapide',
  thies: 'thies-station',
  'saint-louis': 'saint-louis-sor',
  touba: 'touba-mosque',
  kaolack: 'kaolack-market-1900',
  ziguinchor: 'ziguinchor-pirogues',
  tambacounda: 'tambacounda-station',
  africa: 'abidjan-plateau',
  diaspora: 'harlem-116',
};
