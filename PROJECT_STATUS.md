# LËK Network — project status

Updated after each milestone. "Verified" means checked by the CI run recorded on the `ci-artifacts` branch.

## Milestone 1 — foundation
- Next.js 15 App Router + next-intl 4: routing for 10 locales, message loading with fallbacks, middleware, localized 404, catch-all.
- Tailwind removed (it was configured but unused); one hand-written design system in `app/globals.css`.
- Approved logo files integrated (horizontal navy, horizontal light, icon); favicon and app icon.
- Responsive shell: sticky masthead, mobile drawer, language menu, first-visit language suggestion, footer.
- Status: **written; awaiting first CI verification.**

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

## Simulated
See README › Simulated features.
