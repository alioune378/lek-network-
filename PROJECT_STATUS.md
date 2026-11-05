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

## Verification log
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
