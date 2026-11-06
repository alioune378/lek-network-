/**
 * LËK Info — editorial content model (prototype).
 *
 * EVERY STORY BELOW IS FICTIONAL DEMONSTRATION CONTENT, written to test layouts and workflows.
 * None reports a real event, person, figure or accusation. Images are either licensed photographs of places
 * (lib/media, captioned as illustrations unrelated to the story) or the brand's abstract covers.
 *
 * Translations: an article is shown in a language only if that version exists here.
 * `translation` records its review state; anything not "reviewed" is labelled on the page.
 */
import { SITE_DIVISION, type Division } from './brand';
import type { Locale } from './locales';

export type Category = 'society' | 'economy' | 'culture' | 'technology' | 'sport' | 'africa' | 'diaspora' | 'environment' | 'health';
export type TranslationState = 'original' | 'reviewed' | 'needs-review';
export type Localized = Partial<Record<Locale, string>> & { fr: string };

export type Story = {
  slug: string;
  category: Category;
  region: RegionSlug;
  /** Abstract cover: pattern + palette, rendered as SVG (see components/Cover). */
  cover: { pattern: CoverPattern; tone: Tone };
  /** Illustrative photograph from lib/media (licensed, credited, never presented as documenting the story). */
  photo?: string;
  author: string;
  published: string;
  updated?: string;
  readTime: number;
  kicker: Localized;
  title: Localized;
  dek: Localized;
  body: Partial<Record<Locale, string[]>> & { fr: string[] };
  translation: Partial<Record<Locale, TranslationState>>;
  sources: Localized[];
  corrections?: { date: string; text: Localized }[];
  /** Attached video programme, if any. */
  programme?: string;
};

export type CoverPattern = 'weave' | 'rings' | 'grid' | 'waves' | 'diamonds' | 'rays';
export type Tone = 'night' | 'ochre' | 'indigo' | 'clay' | 'forest' | 'sand';

export const CATEGORIES: Category[] = ['society', 'economy', 'culture', 'technology', 'africa', 'diaspora', 'environment', 'health', 'sport'];

export type RegionSlug = 'dakar' | 'thies' | 'saint-louis' | 'touba' | 'kaolack' | 'ziguinchor' | 'tambacounda' | 'africa' | 'diaspora';
export const SENEGAL_REGIONS: RegionSlug[] = ['dakar', 'thies', 'saint-louis', 'touba', 'kaolack', 'ziguinchor', 'tambacounda'];
export const REGION_NAMES: Record<RegionSlug, Localized> = {
  dakar: { fr: 'Dakar', ar: 'داكار' },
  thies: { fr: 'Thiès', ar: 'تييس' },
  'saint-louis': { fr: 'Saint-Louis', ar: 'سان لويس' },
  touba: { fr: 'Touba', ar: 'طوبى' },
  kaolack: { fr: 'Kaolack', ar: 'كولخ' },
  ziguinchor: { fr: 'Ziguinchor', ar: 'زيغينشور' },
  tambacounda: { fr: 'Tambacounda', ar: 'تامباكوندا' },
  africa: { fr: 'Afrique', en: 'Africa', ar: 'أفريقيا', es: 'África', pt: 'África', de: 'Afrika', it: 'Africa', tr: 'Afrika', zh: '非洲', wo: 'Afrig' },
  diaspora: { fr: 'Diaspora', en: 'Diaspora', ar: 'الشتات', es: 'Diáspora', pt: 'Diáspora', de: 'Diaspora', it: 'Diaspora', tr: 'Diaspora', zh: '海外侨民', wo: 'Diaspora' },
};

/** Pick a localized string: requested language, else French. */
export const tx = (v: Localized, locale: Locale): string => v[locale] ?? v.fr;
/** Whether the article itself exists in this language. */
export const hasVersion = (s: Story, locale: Locale) => Boolean(s.body[locale]);

const DEMO_AUTHOR = 'Rédaction LËK (démonstration)';

export const STORIES: Story[] = [
  {
    slug: 'dakar-espaces-publics',
    category: 'society',
    region: 'dakar',
    cover: { pattern: 'grid', tone: 'night' },
    photo: 'dakar-aerial',
    author: DEMO_AUTHOR,
    published: '2026-11-05T07:30:00Z',
    updated: '2026-11-05T10:10:00Z',
    readTime: 6,
    programme: 'senegal-reel',
    kicker: { fr: 'Grand format', en: 'Long read', ar: 'تحقيق مطوّل' },
    title: {
      fr: 'Dakar et ses espaces publics : à qui appartient la ville ?',
      en: 'Dakar’s public spaces: who does the city belong to?',
      ar: 'داكار وفضاءاتها العامة: لمن تنتمي المدينة؟',
    },
    dek: {
      fr: 'Un format de démonstration : comment LËK raconterait les places, trottoirs et plages que partagent les Dakarois, à partir de leurs voix et de données publiques.',
      en: 'A demonstration format: how LËK would tell the story of the squares, pavements and beaches Dakar residents share, through their voices and public data.',
      ar: 'نموذج تجريبي: كيف ستروي «LËK» قصة الساحات والأرصفة والشواطئ التي يتقاسمها سكان داكار، من خلال أصواتهم والبيانات العامة.',
    },
    body: {
      fr: [
        'Ce texte est un scénario éditorial fictif, rédigé pour tester la mise en page des grands formats. Il ne rend compte d’aucune enquête, d’aucun témoignage ni d’aucun chiffre réel.',
        'Un vrai reportage de ce type partirait du terrain : une semaine d’observation dans trois quartiers, des entretiens enregistrés et attribués, et des cartes construites à partir de documents publics consultables par le lecteur.',
        'La rédaction distinguerait clairement ce qui est établi, ce qui est rapporté par des sources nommées et ce qui reste à vérifier. Chaque chiffre renverrait à sa source.',
        'Le format prévoit enfin un épilogue vidéo, produit par l’équipe du programme « Le Sénégal réel », et une section de corrections visible en bas de page.',
      ],
      en: [
        'This is a fictional editorial scenario, written to test the long-read layout. It reports no real investigation, testimony or figure.',
        'A real story of this kind would start in the field: a week of observation in three neighbourhoods, recorded and attributed interviews, and maps built from public documents readers can consult.',
        'The newsroom would clearly separate what is established, what named sources report and what still needs checking. Every figure would link to its source.',
        'The format also allows for a video epilogue produced by the “Le Sénégal réel” team, and a corrections section visible at the foot of the page.',
      ],
      ar: [
        'هذا النص سيناريو تحريري خيالي كُتب لاختبار تصميم المقالات المطوّلة. ولا ينقل أي تحقيق أو شهادة أو رقم حقيقي.',
        'سيبدأ تقرير حقيقي من هذا النوع من الميدان: أسبوع من المراقبة في ثلاثة أحياء، ومقابلات مسجّلة ومنسوبة إلى أصحابها، وخرائط مبنية على وثائق عامة يمكن للقارئ الاطلاع عليها.',
        'وستفصل هيئة التحرير بوضوح بين ما هو ثابت، وما تنقله مصادر مسمّاة، وما يحتاج بعدُ إلى تحقق. وسيُحال كل رقم إلى مصدره.',
        'ويتضمن النموذج أيضًا خاتمة مصوّرة يُنتجها فريق برنامج «السنغال الحقيقي»، وقسمًا للتصحيحات ظاهرًا في أسفل الصفحة.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed', ar: 'needs-review' },
    sources: [
      { fr: 'Exemple de source : plan d’urbanisme publié (fictif)', en: 'Example source: published urban plan (fictional)', ar: 'مثال على مصدر: مخطط عمراني منشور (خيالي)' },
      { fr: 'Exemple de source : entretiens enregistrés, noms et dates à préciser', en: 'Example source: recorded interviews, names and dates to be specified', ar: 'مثال على مصدر: مقابلات مسجّلة، تُحدَّد الأسماء والتواريخ لاحقًا' },
    ],
    corrections: [
      {
        date: '2026-11-05T10:10:00Z',
        text: {
          fr: 'Démonstration du journal des corrections : une précision apportée au deuxième paragraphe serait décrite ici.',
          en: 'Corrections log demonstration: a clarification to the second paragraph would be described here.',
          ar: 'عرض توضيحي لسجل التصحيحات: يُوصف هنا أي توضيح أُضيف إلى الفقرة الثانية.',
        },
      },
    ],
  },
  {
    slug: 'essentiel-format-quotidien',
    category: 'society',
    region: 'dakar',
    cover: { pattern: 'rays', tone: 'ochre' },
    photo: 'brt-petersen',
    author: DEMO_AUTHOR,
    published: '2026-11-05T06:00:00Z',
    readTime: 3,
    programme: 'lessentiel',
    kicker: { fr: 'L’Essentiel', en: 'L’Essentiel', ar: 'الأساسي' },
    title: {
      fr: 'L’Essentiel : cinq minutes pour comprendre la journée',
      en: 'L’Essentiel: five minutes to understand the day',
      ar: 'الأساسي: خمس دقائق لفهم اليوم',
    },
    dek: {
      fr: 'Le briefing quotidien de LËK est en préparation. Voici comment il est pensé : court, sourcé, sans bruit.',
      en: 'LËK’s daily briefing is in preparation. Here is how it is designed: short, sourced and free of noise.',
      ar: 'الموجز اليومي لـ«LËK» قيد الإعداد. هكذا صُمّم: قصير، موثّق المصادر، وخالٍ من الضجيج.',
    },
    body: {
      fr: [
        'Contenu de démonstration. Le programme « L’Essentiel » n’a pas encore été diffusé.',
        'Chaque matin, une sélection de cinq sujets, chacun résumé en trois phrases, avec un lien vers la source principale et vers l’article complet.',
        'Le briefing sera disponible en texte, en audio et en courte vidéo, d’abord en français et en wolof, puis dans d’autres langues après relecture humaine.',
      ],
      en: [
        'Demonstration content. The “L’Essentiel” programme has not aired yet.',
        'Every morning, a selection of five stories, each summarised in three sentences, with a link to the main source and to the full article.',
        'The briefing will come as text, audio and short video, first in French and Wolof, then in other languages after human review.',
      ],
      ar: [
        'محتوى تجريبي. لم يُبثّ برنامج «الأساسي» بعد.',
        'كل صباح، مختارات من خمسة مواضيع، يُلخَّص كلٌّ منها في ثلاث جمل، مع رابط إلى المصدر الرئيسي وإلى المقال الكامل.',
        'سيتوفر الموجز نصًّا وصوتًا وفيديو قصيرًا، بالفرنسية والولوفية أولًا، ثم بلغات أخرى بعد مراجعة بشرية.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed', ar: 'needs-review' },
    sources: [{ fr: 'Document de conception interne (démonstration)', en: 'Internal design document (demonstration)', ar: 'وثيقة تصميم داخلية (عرض توضيحي)' }],
  },
  {
    slug: 'economie-entreprendre-autrement',
    category: 'economy',
    region: 'thies',
    cover: { pattern: 'diamonds', tone: 'sand' },
    photo: 'thies-market',
    author: DEMO_AUTHOR,
    published: '2026-11-04T16:20:00Z',
    readTime: 5,
    programme: 'africa-forward',
    kicker: { fr: 'Économie', en: 'Economy', ar: 'اقتصاد' },
    title: {
      fr: 'Entreprendre à Thiès : raconter l’économie par ceux qui la font',
      en: 'Building a business in Thiès: economics told by the people who make it',
      ar: 'ريادة الأعمال في تييس: الاقتصاد كما يرويه صانعوه',
    },
    dek: {
      fr: 'Démonstration de notre approche économique : des histoires humaines, des données publiques et une méthode expliquée.',
      en: 'A demonstration of our approach to economics: human stories, public data and an explained method.',
      ar: 'عرض لنهجنا في تغطية الاقتصاد: قصص إنسانية، وبيانات عامة، ومنهجية واضحة.',
    },
    body: {
      fr: [
        'Exemple fictif. Aucun chiffre, aucune entreprise et aucun témoignage de cette page ne doivent être lus comme vérifiés.',
        'Le format associerait un portrait, un graphique construit à partir de statistiques publiques et un encadré « méthode » expliquant d’où viennent les données.',
        'Les montants seraient toujours présentés avec leur unité, leur période et leur source, et arrondis sans exagération.',
      ],
      en: [
        'Fictional example. No figure, business or testimony on this page should be read as verified.',
        'The format would combine a profile, a chart built from public statistics and a “method” box explaining where the data comes from.',
        'Amounts would always be shown with their unit, period and source, rounded without exaggeration.',
      ],
      ar: [
        'مثال خيالي. لا ينبغي اعتبار أي رقم أو شركة أو شهادة في هذه الصفحة أمرًا مُتحقَّقًا منه.',
        'سيجمع النموذج بين بورتريه، ورسم بياني مبني على إحصاءات عامة، وإطار «المنهجية» يشرح مصدر البيانات.',
        'وستُعرض المبالغ دائمًا مع وحدتها وفترتها ومصدرها، ومقرّبةً دون مبالغة.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed', ar: 'needs-review' },
    sources: [{ fr: 'Exemple de source : statistiques publiques nationales (à préciser)', en: 'Example source: national public statistics (to be specified)', ar: 'مثال على مصدر: إحصاءات وطنية عامة (تُحدَّد لاحقًا)' }],
  },
  {
    slug: 'saint-louis-voix-creatives',
    category: 'culture',
    region: 'saint-louis',
    cover: { pattern: 'waves', tone: 'clay' },
    photo: 'saint-louis-fleet',
    author: DEMO_AUTHOR,
    published: '2026-11-04T11:00:00Z',
    readTime: 4,
    programme: 'conversations',
    kicker: { fr: 'Culture', en: 'Culture', ar: 'ثقافة' },
    title: {
      fr: 'Saint-Louis, les voix de la création : une série en préparation',
      en: 'Saint-Louis, creative voices: a series in development',
      ar: 'سان لويس، أصوات الإبداع: سلسلة قيد الإعداد',
    },
    dek: {
      fr: 'Comment notre format documentaire mettrait en lumière les parcours d’artistes, d’artisans et de musiciens.',
      en: 'How our documentary format would bring the journeys of artists, craftspeople and musicians to light.',
      ar: 'كيف سيُبرز نموذجنا الوثائقي مسارات الفنانين والحرفيين والموسيقيين.',
    },
    body: {
      fr: [
        'Présentation fictive d’un format documentaire. Aucun entretien n’a encore été réalisé pour ce contenu.',
        'Les épisodes envisagés associeraient entretiens longs, images de terrain et archives dont les droits sont confirmés.',
        'Chaque personne filmée validerait son portrait avant diffusion, et chaque image d’archive serait créditée.',
      ],
      en: [
        'A fictional preview of a documentary format. No interviews have been recorded for this content.',
        'The planned episodes would combine long interviews, location footage and archives with cleared rights.',
        'Everyone filmed would approve their portrait before broadcast, and every archive image would be credited.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Note d’intention du programme (démonstration)', en: 'Programme treatment (demonstration)' }],
  },
  {
    slug: 'technologie-sans-jargon',
    category: 'technology',
    region: 'dakar',
    cover: { pattern: 'rings', tone: 'indigo' },
    author: DEMO_AUTHOR,
    published: '2026-11-03T15:45:00Z',
    readTime: 4,
    kicker: { fr: 'Technologie', en: 'Technology', ar: 'تكنولوجيا' },
    title: {
      fr: 'Expliquer le numérique sans jargon : notre future rubrique technologie',
      en: 'Explaining digital life without jargon: our future technology desk',
      ar: 'شرح العالم الرقمي دون مصطلحات معقدة: قسم التكنولوجيا المقبل',
    },
    dek: {
      fr: 'Des explications accessibles, des limites clairement dites et aucun sensationnalisme.',
      en: 'Accessible explanations, clearly stated limits and no sensationalism.',
      ar: 'شروح مبسطة، وحدود مُعلنة بوضوح، ولا إثارة.',
    },
    body: {
      fr: [
        'Exemple fictif destiné à tester un article explicatif.',
        'Les vraies publications citeront des sources vérifiables et des experts nommés, et diront ce que l’on ne sait pas encore.',
        'Un glossaire en fin d’article expliquera les termes techniques en français, en wolof et en anglais.',
      ],
      en: [
        'Fictional example used to test an explainer article.',
        'Real articles will cite verifiable sources and named experts, and say what is not yet known.',
        'A glossary at the end of each article will explain technical terms in French, Wolof and English.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Charte éditoriale LËK, section explicative (démonstration)', en: 'LËK editorial charter, explainer section (demonstration)' }],
  },
  {
    slug: 'touba-hospitalite-logistique',
    category: 'society',
    region: 'touba',
    cover: { pattern: 'weave', tone: 'forest' },
    photo: 'touba-mosque',
    author: DEMO_AUTHOR,
    published: '2026-11-03T09:10:00Z',
    readTime: 5,
    kicker: { fr: 'Régions', en: 'Regions', ar: 'الجهات' },
    title: {
      fr: 'Touba : raconter l’accueil et la logistique d’une grande ville',
      en: 'Touba: telling the story of welcome and logistics in a major city',
      ar: 'طوبى: رواية الضيافة والتنظيم في مدينة كبرى',
    },
    dek: {
      fr: 'Un format régional de démonstration, centré sur les métiers qui font fonctionner la ville.',
      en: 'A demonstration regional format focused on the jobs that keep the city running.',
      ar: 'نموذج جهوي تجريبي يركّز على المهن التي تُسيّر المدينة.',
    },
    body: {
      fr: [
        'Contenu fictif de démonstration. Il ne décrit aucun événement ni aucune personne réelle.',
        'Un correspondant régional travaillerait avec un éditeur à Dakar, et chaque article régional serait relu par une personne connaissant le terrain.',
        'Les sujets religieux et communautaires seraient traités avec précision et respect, en donnant la parole aux personnes concernées.',
      ],
      en: [
        'Fictional demonstration content. It does not describe any real event or person.',
        'A regional correspondent would work with an editor in Dakar, and every regional story would be read by someone who knows the area.',
        'Religious and community subjects would be covered accurately and respectfully, giving a voice to the people concerned.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Exemple : réseau de correspondants régionaux (en constitution)', en: 'Example: regional correspondents network (being formed)' }],
  },
  {
    slug: 'ziguinchor-agriculture-saisons',
    category: 'environment',
    region: 'ziguinchor',
    cover: { pattern: 'waves', tone: 'forest' },
    photo: 'kabrousse-rice',
    author: DEMO_AUTHOR,
    published: '2026-11-02T13:30:00Z',
    readTime: 5,
    kicker: { fr: 'Environnement', en: 'Environment', ar: 'بيئة' },
    title: {
      fr: 'En Casamance, raconter les saisons agricoles au plus près des champs',
      en: 'In Casamance, telling the story of the farming seasons from the fields',
      ar: 'في كازامانس: رواية المواسم الزراعية من قلب الحقول',
    },
    dek: {
      fr: 'Démonstration d’un format environnement : observation longue, données climatiques publiques et paroles d’agriculteurs.',
      en: 'A demonstration environment format: long observation, public climate data and farmers’ voices.',
      ar: 'نموذج بيئي تجريبي: مراقبة طويلة، وبيانات مناخية عامة، وأصوات المزارعين.',
    },
    body: {
      fr: [
        'Contenu fictif. Aucune donnée climatique n’est présentée ici comme réelle.',
        'Le format suivrait une même exploitation sur une saison complète, avec des visites mensuelles et des graphiques mis à jour.',
        'Les données viendraient de services météorologiques publics et seraient toujours datées.',
      ],
      en: [
        'Fictional content. No climate data here is presented as real.',
        'The format would follow one farm through a full season, with monthly visits and updated charts.',
        'Data would come from public weather services and would always be dated.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Exemple de source : relevés météorologiques publics (à préciser)', en: 'Example source: public weather records (to be specified)' }],
  },
  {
    slug: 'kaolack-terrains-talents',
    category: 'sport',
    region: 'kaolack',
    cover: { pattern: 'rays', tone: 'clay' },
    photo: 'laamb-dialaw',
    author: DEMO_AUTHOR,
    published: '2026-11-02T08:00:00Z',
    readTime: 3,
    kicker: { fr: 'Sport', en: 'Sport', ar: 'رياضة' },
    title: {
      fr: 'Terrains et talents : le sport au-delà du score',
      en: 'Fields and talent: sport beyond the score',
      ar: 'ملاعب ومواهب: الرياضة أبعد من النتيجة',
    },
    dek: {
      fr: 'Une idée de reportage sur les clubs de quartier, les entraîneurs bénévoles et la formation.',
      en: 'A story idea about neighbourhood clubs, volunteer coaches and youth training.',
      ar: 'فكرة تقرير عن أندية الأحياء والمدربين المتطوعين وتكوين الشباب.',
    },
    body: {
      fr: [
        'Concept éditorial fictif.',
        'Cette approche privilégierait les parcours, la formation et les communautés plutôt que les seuls résultats.',
      ],
      en: [
        'Fictional editorial concept.',
        'This approach would focus on journeys, training and communities rather than results alone.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Démonstration — aucune source réelle', en: 'Demonstration — no real source' }],
  },
  {
    slug: 'tambacounda-ecole-distance',
    category: 'health',
    region: 'tambacounda',
    cover: { pattern: 'grid', tone: 'sand' },
    photo: 'tambacounda-station',
    author: DEMO_AUTHOR,
    published: '2026-11-01T10:00:00Z',
    readTime: 4,
    kicker: { fr: 'Santé', en: 'Health', ar: 'صحة' },
    title: {
      fr: 'Tambacounda : comment couvrir la santé de proximité avec rigueur',
      en: 'Tambacounda: covering community health with rigour',
      ar: 'تامباكوندا: كيف نغطي الصحة المحلية بدقة',
    },
    dek: {
      fr: 'Démonstration de nos règles pour les sujets de santé : sources médicales nommées, pas de conseils non vérifiés.',
      en: 'A demonstration of our rules for health stories: named medical sources and no unverified advice.',
      ar: 'عرض لقواعدنا في المواضيع الصحية: مصادر طبية مسمّاة، ولا نصائح غير متحقَّق منها.',
    },
    body: {
      fr: [
        'Contenu fictif. Cette page ne donne aucun conseil médical.',
        'Les articles de santé seraient relus par un professionnel de santé nommé et renverraient vers les services officiels.',
      ],
      en: [
        'Fictional content. This page gives no medical advice.',
        'Health stories would be reviewed by a named health professional and point readers to official services.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Charte éditoriale LËK, sujets de santé (démonstration)', en: 'LËK editorial charter, health topics (demonstration)' }],
  },
  {
    slug: 'afrique-regards-croises',
    category: 'africa',
    region: 'africa',
    cover: { pattern: 'diamonds', tone: 'indigo' },
    photo: 'abidjan-plateau',
    author: DEMO_AUTHOR,
    published: '2026-10-31T17:00:00Z',
    readTime: 5,
    programme: 'conversations',
    kicker: { fr: 'Afrique', en: 'Africa', ar: 'أفريقيا' },
    title: {
      fr: 'Regards croisés : un continent, des perspectives multiples',
      en: 'Crossed perspectives: one continent, many viewpoints',
      ar: 'نظرات متقاطعة: قارة واحدة ورؤى متعددة',
    },
    dek: {
      fr: 'Un aperçu du journalisme panafricain que LËK veut construire, avec des correspondants sur place.',
      en: 'A preview of the pan-African journalism LËK aims to build, with correspondents on the ground.',
      ar: 'لمحة عن الصحافة الأفريقية التي تطمح «LËK» إلى بنائها، بمراسلين في الميدان.',
    },
    body: {
      fr: [
        'Démonstration fictive, pas un reportage publié.',
        'L’ambition : couvrir des réalités diverses avec des journalistes locaux, et éviter les récits venus de loin.',
      ],
      en: [
        'Fictional demonstration, not a published report.',
        'The ambition: cover diverse realities with local journalists, and avoid stories told from afar.',
      ],
      ar: [
        'عرض خيالي، وليس تقريرًا منشورًا.',
        'الطموح: تغطية واقع متنوّع بصحفيين محليين، وتجنّب الروايات القادمة من بعيد.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed', ar: 'needs-review' },
    sources: [{ fr: 'Démonstration — aucune source réelle', en: 'Demonstration — no real source', ar: 'عرض توضيحي — لا مصدر حقيقي' }],
  },
  {
    slug: 'diaspora-liens-dakar-new-york',
    category: 'diaspora',
    region: 'diaspora',
    cover: { pattern: 'rings', tone: 'ochre' },
    photo: 'chateau-rouge',
    author: DEMO_AUTHOR,
    published: '2026-10-30T19:00:00Z',
    readTime: 4,
    kicker: { fr: 'Diaspora', en: 'Diaspora', ar: 'الشتات' },
    title: {
      fr: 'De Dakar à New York, Paris et Montréal : informer la diaspora',
      en: 'From Dakar to New York, Paris and Montreal: informing the diaspora',
      ar: 'من داكار إلى نيويورك وباريس ومونتريال: إعلام الجاليات',
    },
    dek: {
      fr: 'Comment une rubrique diaspora relierait les Sénégalais de l’étranger à l’actualité du pays, et inversement.',
      en: 'How a diaspora section would connect Senegalese abroad with news from home, and the other way round.',
      ar: 'كيف سيربط قسم الشتات السنغاليين في الخارج بأخبار الوطن، والعكس.',
    },
    body: {
      fr: [
        'Contenu fictif de démonstration.',
        'La rubrique publierait des informations pratiques vérifiées, des portraits et des débats, dans les langues de la diaspora.',
      ],
      en: [
        'Fictional demonstration content.',
        'The section would publish verified practical information, profiles and debates, in the languages of the diaspora.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed' },
    sources: [{ fr: 'Démonstration — aucune source réelle', en: 'Demonstration — no real source' }],
  },
  {
    slug: 'enquete-methode',
    category: 'society',
    region: 'dakar',
    cover: { pattern: 'grid', tone: 'night' },
    photo: 'dakar-port',
    author: DEMO_AUTHOR,
    published: '2026-10-29T12:00:00Z',
    readTime: 7,
    programme: 'investigations',
    kicker: { fr: 'LËK Investigations', en: 'LËK Investigations', ar: 'تحقيقات LËK' },
    title: {
      fr: 'Notre méthode d’enquête, expliquée avant la première publication',
      en: 'Our investigative method, explained before the first publication',
      ar: 'منهجيتنا في التحقيق، مشروحة قبل أول نشر',
    },
    dek: {
      fr: 'Droit de réponse, protection des sources, documents vérifiables : les règles qui s’appliqueront à chaque enquête.',
      en: 'Right of reply, source protection, verifiable documents: the rules every investigation will follow.',
      ar: 'حق الرد، وحماية المصادر، والوثائق القابلة للتحقق: القواعد التي ستُطبَّق على كل تحقيق.',
    },
    body: {
      fr: [
        'Ce texte présente des principes, pas une enquête. Aucune accusation n’y figure.',
        'Toute personne mise en cause sera contactée avant publication, avec un délai raisonnable pour répondre, et sa réponse sera publiée.',
        'Les documents seront vérifiés par au moins deux membres de la rédaction ; les sources confidentielles seront protégées et connues du rédacteur en chef.',
        'Une enquête n’est publiée qu’après relecture juridique et validation par la direction de la rédaction.',
      ],
      en: [
        'This text sets out principles, not an investigation. It contains no accusation.',
        'Anyone implicated will be contacted before publication, given reasonable time to respond, and their response will be published.',
        'Documents will be checked by at least two members of the newsroom; confidential sources will be protected and known to the editor-in-chief.',
        'An investigation is published only after legal review and sign-off by the editorial leadership.',
      ],
      ar: [
        'يعرض هذا النص مبادئ، وليس تحقيقًا. ولا يتضمن أي اتهام.',
        'سيتم التواصل مع أي شخص معنيّ قبل النشر، ويُمنح مهلة معقولة للرد، ويُنشر ردّه.',
        'سيتحقق من الوثائق عضوان على الأقل من هيئة التحرير؛ وتُحمى المصادر السرية ويعرفها رئيس التحرير.',
        'لا يُنشر أي تحقيق إلا بعد مراجعة قانونية وموافقة إدارة التحرير.',
      ],
    },
    translation: { fr: 'original', en: 'reviewed', ar: 'needs-review' },
    sources: [{ fr: 'Charte éditoriale LËK (projet)', en: 'LËK editorial charter (draft)', ar: 'ميثاق «LËK» التحريري (مشروع)' }],
  },
];

export const storyBySlug = (slug: string) => STORIES.find((s) => s.slug === slug);
export const byDate = (a: Story, b: Story) => b.published.localeCompare(a.published);
export const latest = () => [...STORIES].sort(byDate);
export const related = (s: Story, n = 3) =>
  latest()
    .filter((x) => x.slug !== s.slug)
    .sort((a, b) => Number(b.category === s.category || b.region === s.region) - Number(a.category === s.category || a.region === s.region))
    .slice(0, n);

/* ------------------------------------------------------------------ Programmes (LËK Watch & Originals) */

export type ProgrammeState = 'in-development' | 'in-production' | 'available';
export type Episode = { n: number; title: Localized; state: ProgrammeState; duration?: string; src?: string; poster?: string; subtitles?: Locale[]; transcript?: boolean };
export type Programme = {
  slug: string;
  name: string;
  format: Localized;
  logline: Localized;
  description: Localized;
  cover: { pattern: CoverPattern; tone: Tone };
  /** Mood image from lib/media — a location photograph, not a still from the programme. */
  photo?: string;
  /** Use the LËK ident (brand motion) as the programme's image instead of a photograph. */
  brandPoster?: boolean;
  /** Watch collection the programme belongs to. */
  kind: 'briefing' | 'documentary' | 'interview' | 'series' | 'investigation';
  /** Planned running time per episode, e.g. "5 min", "52 min". */
  runtime: string;
  state: ProgrammeState;
  seasons: { n: number; episodes: Episode[] }[];
  credits: { role: Localized; name: string }[];
  distribution: Localized;
  /**
   * The LËK division that publishes the programme. Defaults to "info" (LËK Info, this site).
   * Assign "media" to future entertainment programming: it then leaves every LËK Info listing, page and sitemap
   * automatically, so a programme is never published by two divisions at once.
   */
  division?: Division;
};

const TBC = 'À confirmer';
const devEpisodes = (k: number): Episode[] =>
  Array.from({ length: k }, (_, i) => ({ n: i + 1, state: 'in-development' as const, title: { fr: `Épisode ${i + 1} — en préparation`, en: `Episode ${i + 1} — in preparation`, ar: `الحلقة ${i + 1} — قيد الإعداد` } }));
const devCredits = () => [
  { role: { fr: 'Production', en: 'Production', ar: 'الإنتاج' }, name: 'LËK Studios' },
  { role: { fr: 'Réalisation', en: 'Director', ar: 'الإخراج' }, name: TBC },
  { role: { fr: 'Rédaction en chef', en: 'Editor', ar: 'رئاسة التحرير' }, name: TBC },
];

/** Every programme LËK holds, whatever its division. Pages use PROGRAMMES (this site's division only). */
export const ALL_PROGRAMMES: Programme[] = [
  {
    slug: 'lessentiel',
    name: 'L’ESSENTIEL',
    format: { fr: 'Briefing quotidien · 5 min', en: 'Daily briefing · 5 min', ar: 'موجز يومي · 5 دقائق' },
    logline: { fr: 'Cinq sujets, cinq minutes, chaque matin.', en: 'Five stories, five minutes, every morning.', ar: 'خمسة مواضيع، خمس دقائق، كل صباح.' },
    description: {
      fr: 'Le rendez-vous quotidien de LËK : l’actualité du Sénégal et de l’Afrique, sourcée et expliquée, en vidéo courte, en audio et en texte.',
      en: 'LËK’s daily appointment: the news from Senegal and Africa, sourced and explained, as short video, audio and text.',
      ar: 'موعد «LËK» اليومي: أخبار السنغال وأفريقيا، موثّقة المصادر ومشروحة، في فيديو قصير وصوت ونص.',
    },
    cover: { pattern: 'rays', tone: 'ochre' },
    brandPoster: true,
    kind: 'briefing',
    runtime: '5 min',
    state: 'in-development',
    seasons: [{ n: 1, episodes: devEpisodes(3) }],
    credits: devCredits(),
    distribution: { fr: 'Site LËK, réseaux sociaux, radio partenaires (à confirmer)', en: 'LËK website, social platforms, partner radio (to be confirmed)', ar: 'موقع LËK، وشبكات التواصل، وإذاعات شريكة (يُؤكَّد لاحقًا)' },
  },
  {
    slug: 'senegal-reel',
    name: 'LE SÉNÉGAL RÉEL',
    format: { fr: 'Série documentaire · 26 min', en: 'Documentary series · 26 min', ar: 'سلسلة وثائقية · 26 دقيقة' },
    logline: { fr: 'Le pays raconté par ceux qui le vivent.', en: 'The country told by the people who live it.', ar: 'البلد كما يرويه من يعيشونه.' },
    description: {
      fr: 'Des documentaires tournés dans les quatorze régions, avec le temps long du terrain et la parole donnée aux habitants.',
      en: 'Documentaries filmed across the fourteen regions, with the patience of fieldwork and residents’ own voices.',
      ar: 'أفلام وثائقية تُصوَّر في الجهات الأربع عشرة، بنفَس العمل الميداني الطويل وأصوات السكان.',
    },
    cover: { pattern: 'grid', tone: 'night' },
    photo: 'lac-rose',
    kind: 'documentary',
    runtime: '26 min',
    state: 'in-development',
    seasons: [{ n: 1, episodes: devEpisodes(6) }],
    credits: devCredits(),
    distribution: { fr: 'LËK Watch, diffuseurs partenaires, festivals (à confirmer)', en: 'LËK Watch, partner broadcasters, festivals (to be confirmed)', ar: 'LËK Watch، وقنوات شريكة، ومهرجانات (يُؤكَّد لاحقًا)' },
  },
  {
    slug: 'conversations',
    name: 'CONVERSATIONS D’AFRIQUE',
    format: { fr: 'Entretiens · 45 min', en: 'Interviews · 45 min', ar: 'مقابلات · 45 دقيقة' },
    logline: { fr: 'Prendre le temps d’écouter.', en: 'Taking the time to listen.', ar: 'أن نأخذ الوقت للإصغاء.' },
    description: {
      fr: 'De longs entretiens avec celles et ceux qui pensent, créent et construisent l’Afrique d’aujourd’hui.',
      en: 'Long-form conversations with the people thinking, creating and building today’s Africa.',
      ar: 'حوارات مطوّلة مع من يفكرون ويبدعون ويبنون أفريقيا اليوم.',
    },
    cover: { pattern: 'waves', tone: 'clay' },
    photo: 'goree',
    kind: 'interview',
    runtime: '45 min',
    state: 'in-development',
    seasons: [{ n: 1, episodes: devEpisodes(4) }],
    credits: devCredits(),
    distribution: { fr: 'LËK Watch, podcast (à confirmer)', en: 'LËK Watch, podcast (to be confirmed)', ar: 'LËK Watch، بودكاست (يُؤكَّد لاحقًا)' },
  },
  {
    slug: 'africa-forward',
    name: 'AFRICA FORWARD',
    format: { fr: 'Magazine · 13 min', en: 'Magazine · 13 min', ar: 'مجلة · 13 دقيقة' },
    logline: { fr: 'Innovation, entreprises et transformations africaines.', en: 'African innovation, business and transformation.', ar: 'الابتكار والأعمال والتحولات الأفريقية.' },
    description: {
      fr: 'Un magazine sur ceux qui inventent des solutions, avec des chiffres vérifiés et un regard critique.',
      en: 'A magazine about the people inventing solutions, with verified figures and a critical eye.',
      ar: 'مجلة عن مبتكري الحلول، بأرقام مُتحقَّق منها ونظرة نقدية.',
    },
    cover: { pattern: 'diamonds', tone: 'sand' },
    photo: 'ter-dakar',
    kind: 'series',
    runtime: '13 min',
    state: 'in-development',
    seasons: [{ n: 1, episodes: devEpisodes(4) }],
    credits: devCredits(),
    distribution: { fr: 'LËK Watch, partenaires (à confirmer)', en: 'LËK Watch, partners (to be confirmed)', ar: 'LËK Watch، شركاء (يُؤكَّد لاحقًا)' },
  },
  {
    slug: 'investigations',
    name: 'LËK INVESTIGATIONS',
    format: { fr: 'Enquêtes · formats variables', en: 'Investigations · various formats', ar: 'تحقيقات · أشكال متنوعة' },
    logline: { fr: 'Documenter, vérifier, publier.', en: 'Document, verify, publish.', ar: 'نوثّق، نتحقق، ننشر.' },
    description: {
      fr: 'Le journalisme d’investigation de LËK, publié uniquement après vérification documentaire, droit de réponse et relecture juridique.',
      en: 'LËK’s investigative journalism, published only after document checks, right of reply and legal review.',
      ar: 'صحافة LËK الاستقصائية، لا تُنشر إلا بعد التحقق من الوثائق وحق الرد والمراجعة القانونية.',
    },
    cover: { pattern: 'weave', tone: 'night' },
    photo: 'dakar-skyline',
    kind: 'investigation',
    runtime: '',
    state: 'in-development',
    seasons: [{ n: 1, episodes: devEpisodes(2) }],
    credits: devCredits(),
    distribution: { fr: 'Site LËK, LËK Watch', en: 'LËK website, LËK Watch', ar: 'موقع LËK، LËK Watch' },
  },
];

export const divisionOf = (p: Programme): Division => p.division ?? 'info';
/** Programmes published by this site (LËK Info). */
export const PROGRAMMES: Programme[] = ALL_PROGRAMMES.filter((p) => divisionOf(p) === SITE_DIVISION);
/** Programmes assigned to another division (none yet): candidates for redirects once that division has a site. */
export const PROGRAMMES_ELSEWHERE: Programme[] = ALL_PROGRAMMES.filter((p) => divisionOf(p) !== SITE_DIVISION);
export const programmeBySlug = (slug: string) => PROGRAMMES.find((p) => p.slug === slug);
