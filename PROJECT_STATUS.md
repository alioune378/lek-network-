# LËK Network — project status

Updated after each milestone. "Verified" means checked by the CI run recorded on the `ci-artifacts` branch.

## Milestone 1 — foundation
- Next.js 15 App Router + next-intl 4: routing for 10 locales, message loading with fallbacks, middleware, localized 404, catch-all.
- Tailwind removed (it was configured but unused); one hand-written design system in `app/globals.css`.
- Approved logo files integrated (horizontal navy, horizontal light, icon); favicon and app icon.
- Responsive shell: sticky masthead, mobile drawer, language menu, first-visit language suggestion, footer.

## Milestone 2 — news
- Homepage (lead, L’Essentiel briefing, secondary stories, Watch band, latest, regions, Africa & diaspora, standards, Studios).
- Article page (byline, dates, reading time, text size, sharing, translation state, sources, corrections, related programme, related articles).
- Category, region (7 Senegal regions + Africa + diaspora), regions overview, search (accent-insensitive, filters, shareable URL).

## Milestone 3 — video and production
- LËK Watch, programme pages (5 Originals with seasons, episodes, trailer slot, credits, distribution), Originals slate, Live (4 states, offline by default), reusable Player (MP4/HLS, muted, tap to play), LËK Studios with validated inquiry.

## Milestone 4 — newsroom
- Browser-only CMS demo: roles, workflow draft → review → approved → scheduled → published (demo), history, preview, translation matrix, corrections, media library, video metadata.

## Milestone 5 — checks
- CI: translation coverage, type check, lint, production build, rendered checks (overflow, errors, RTL, language switching, search, drawer, 404) with screenshots.

## Milestone 6 — visual transformation
- **Photography:** 23 freely licensed Wikimedia Commons photos (Dakar, Thiès, Saint-Louis, Touba, Kaolack, Ziguinchor, Tambacounda, Casamance, Lac Rose, Gorée, the TER, Abidjan, Harlem, sabar, laamb wrestling, a film set). Every caption says the photo shows a place and is unrelated to the fictional story. `/credits` and `MEDIA_CREDITS.md` list author, year and licence for each. Nothing was generated or altered by AI.
- **Homepage:** compact header; photographic lead and the L’Essentiel briefing; a row of varied weights (feature, three side stories, one text-only card); a cinematic Watch band with a poster rail; a compact stream of stories not shown above; photo tiles for each region plus "more regions to come"; Africa and diaspora panels; a Studios preview.
- **Mobile menu:** compact logo, labelled close button, search, seven primary sections as tiles, category chips, a language grid and secondary links. Focus moves into the menu, is trapped while it is open and returns on close; Escape closes it; the page behind stops scrolling.
- **Navigation:** the newsroom left public navigation (it is now under "prototype tools" in the footer). New pages: Privacy and Photo credits. The footer is more compact.
- **Watch:** cinematic hero, availability legend, collections (documentaries and investigations, interviews, series and briefings), format and runtime labels, planned episode counts. Mood images are labelled as not coming from any programme.
- **Divisions:** distinct marks for LËK Info/News, Watch, Live (red dot only when on air), Originals and Studios.
- **Pages:** article photos with full captions and an Open Graph image; region pages with photo banners; photos on the regions overview, Originals slate, programme banners and the Studios hero.
- **Fixes:** French narrow no-break spaces before `: ; ! ?`; form fields no longer widen the page at 320px in Arabic; the edge padding of the poster rail; hover zoom switched off under reduced motion.

## Verification log
- **CI run 42061711035 (commit fb992f0): passed.**
  - Translation coverage, type check, lint and `next build` succeeded.
  - 85 full-page screenshots at 390px and 1440px, in FR, EN and AR.
  - Overflow audit of 192 page loads at 320, 375, 430 and 768px: no horizontal overflow, broken images, console errors or failed requests.
  - Checks passed:
    - The logo loads with the correct 2.43 ratio.
    - The menu opens, moves focus inside and stops the page scrolling; it scrolls on its own and has no newsroom link.
    - Escape closes the menu and returns focus.
    - Switching language from the menu and from the desktop menu keeps the same page.
    - An anchor target is not hidden under the sticky header.
    - Reduced motion turns transitions off.
    - Search and the 404 page work.

- **CI run 42052229510 (commit cdcdb6a): passed.** Translation coverage, type check, lint and `next build` succeeded; all pages statically generated for the 10 locales. Rendered checks on 63 pages (FR/EN/AR × 21 pages, mobile 390px and desktop 1440px): no console errors, no failed requests, `dir="rtl"` on Arabic. Interaction checks passed: language suggestion, mobile drawer, switching an article to Arabic keeps the same article, fallback notice, search ("thies" → 1 result), 404.
  - Problems found in that run and fixed afterwards:
    - Mobile Arabic Studios page scrolled sideways by 10px (the form column could not shrink). Fixed with a shrinkable grid column.
    - The supplied horizontal logo file cut off the bottom of the word "Network" (the artwork ran past its own frame). Only the frame (viewBox) was enlarged; the artwork is unchanged. Applied to the navy and light horizontal versions.
    - The French tagline in the top strip was reordered by the Arabic text direction (".d'avance") and wrapped on phones. It is now marked as French, left-to-right, on one line.
  - Overflow reports now name the elements responsible.
- The next CI run re-verifies these fixes; see the latest run on the `ci-artifacts` branch.
- **Not deployed.** The production build succeeds in CI, but the site has not been deployed to Netlify yet.

## Simulated
See README › Simulated features.
