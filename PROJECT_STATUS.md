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

## Milestone 7 — broadcast identity, art direction, mobile storytelling
- **Ident (v1 concept)** — 6 seconds, silent, made only from the approved logo:
  - Sequence: a gold time line is drawn and measured, and a marker races ahead. Geometric facets fold in and the hare leaps in "one step ahead". The LËK letters rise, the Ë dots drop in, then "Network" and the tagline appear.
  - One source (`lib/ident.ts` + `components/ident.css`) drives both:
    - the website version: plays once when scrolled into view and offers a replay button; with reduced motion it is the finished still frame, with no replay button.
    - the video render: 1080p and 720p MP4 plus a still frame.
  - Used on:
    - the Live page's off-air screen.
    - trailer slots on programme pages.
    - the image for L'Essentiel, the daily briefing, in the Watch row and on the Watch page.
    - a new "On-air identity" section on the Studios page, with the video and a download link.
- **Art direction system:**
  - Image ratios: editorial 3:2, thumbnails 1:1, video 16:9, places 3:4.
  - One photo grade for every photograph.
  - Archive images are monochrome with an "Archive · year" label.
  - Gold viewfinder corners mark video imagery.
  - Headline sizes and section spacing come from shared settings.
- **Photography:** six more recent photos replace the clichés (two sunsets and a backlit bridge) and the oldest or lowest-resolution images:
  - Dakar BRT stop, 2026
  - Saint-Louis fishing fleet, 2020
  - Château-Rouge in Paris, 2021
  - Dakar port and skyline, 2021
  - Kabrousse rice fields, 2023
  - Kaolack main street, 2018 (replaces the 1900 postcard)
  - The replaced files were removed.
- **Mobile homepage:**
  - Full-bleed 4:5 hero with the headline set on the photo.
  - L'Essentiel shown as a timeline of the day, with headlines limited to two lines.
  - The Watch feature stays 16:9, with its copy below and a "From the newsroom" link back to the related article.
  - Stories tied to a programme carry a LËK Watch link, and the stream marks them "Video".
  - Regions are a swipeable row of 3:4 place cards.
  - Tighter sections; the mobile homepage went from 7,820px to 6,849px tall.

## Milestone 8 — LËK Community (built and tested; switched OFF in production)
- **Plan and architecture**: `docs/COMMUNITY.md` covers the inspection, choices, data model, security, moderation, retention, launch checklist and phases.
- **Stack**:
  - PostgreSQL with parameterised SQL only.
  - Better Auth for email and password, mandatory email verification, password reset, database sessions, the username plugin and built-in rate limits. There is no custom cryptography.
  - Turnstile and a honeypot field when keys are configured.
  - Transactional email through Resend when configured; captured in the database in demo mode.
- **Built**:
  - Registration (pseudonyms allowed, unique case-insensitive usernames, guidelines acceptance, impersonation checks, registration that does not reveal which emails have accounts) and login/logout.
  - Verification, password reset, resend, and account deletion (personal data scrubbed, link kept internally for the retention period).
  - Member profiles: public history, replies received, helpful marks, privacy toggles.
  - Comments under articles and programmes:
    - one level of replies;
    - edits with an indicator and revision history;
    - deletion;
    - "helpful" reactions with anti-manipulation rules;
    - reports, sorting (most helpful / newest), pagination, optional reply notifications;
    - staff editorial notes and verified staff badges.
  - Moderation:
    - deterministic checks (links, spam, private information, threats, duplicates, coordinated posting, impersonation, repeat offenders), with no political scoring;
    - a human review queue with severity, source, reasons, context and suggested step;
    - graduated accountability (notice → warning → removal → restriction → suspension → escalation);
    - appeals reviewed by a different moderator, restoration of removed comments, and an append-only audit log;
    - an explicit choice required for held comments.
  - "Votre voix compte": private feedback (six categories) and a newsroom inbox with status, assignee, notes and replies. Each reply is honestly labelled as visible in the account, sent by email, or internal.
  - French, English and Arabic interface (right-to-left, names isolated for correct direction); Wolof terms prepared for review.
  - Security headers.
- **Verified** (community workflow, run 42113319907, commit 188612d, real Postgres 16, production build with `COMMUNITY_MODE=demo`):
  - 12/12 unit tests and **61/61 acceptance checks**.
  - Type check, lint and build passed; migrations are idempotent.
  - The production pipeline (community off) still passes: 85 screenshots, 192 audited pages, no problems.
- **Not done / needs the owner**: see `docs/COMMUNITY.md` §10. Production database, auth secret, email provider with a verified sending domain, Turnstile keys, first admin, legal/privacy review (Senegal CDP, GDPR), approval of the guidelines, Wolof review, a secure tip channel, and a separate preview deploy.

## Milestone 9 — Private pilot preparation (staging; community still OFF in production)
- **Setup, costs, risks and launch checklist**: `docs/STAGING.md`.
- **Built**:
  - Invitation-only registration. Registration is closed by default; public registration needs `live` mode plus the founder's dated approval flag.
  - Single-use invitations: hash stored, link shown once, optional binding to one email, expiry, revocation.
  - One-time founder bootstrap (`BOOTSTRAP_TOKEN` + `FOUNDER_EMAIL`): the link is emailed and never displayed; the bootstrap closes once an owner exists.
  - Staff powers require a verified email, two-step verification (TOTP with backup codes) and a sign-in less than 12 hours old.
  - Role hierarchy with an owner (founder). Admins cannot create admins or touch the owner; nobody changes their own role.
  - Pilot guide and questionnaire (tasks, 1–5 ratings, comprehension check, free text). Editors and above see anonymous results.
  - Explicit consent to the privacy notice (versioned) and to the pilot conditions.
  - Staging protections: noindex header, robots disallow, visible badge, no-store on the API, build-time migrations, and a build that refuses CI-only settings on Netlify.
  - The privacy page names the processors (Netlify, Resend, Cloudflare Turnstile), states the real IP and session retention, and has a pilot section. A routine clean-up removes IP-bearing records.
- **Verified** (community workflow, run 42125918569, commit 316797a):
  - Built in the exact pilot configuration (pilot mode, invite-only, `LEK_ENV=staging`).
  - Postgres 16, Cloudflare Turnstile **test** keys, emails captured rather than sent.
  - Results: 12/12 unit tests, **94/94 acceptance checks**; type check, lint and build passed.
- **Staging site**: `leknetwork-staging` was created with team-login protection on all deploys and the non-secret variables set. It is **not functional yet**: the founder must link the repo (branch `staging`), create the database, and set the secrets (`docs/STAGING.md` §2).
- **Not yet proven**: real email delivery (Resend) and Turnstile with real keys. These need the end-to-end test in `docs/STAGING.md` §5.

## Milestone 10 — Brand migration phase 1: LËK Info (staging branch only)
- The news publication is now **LËK Info**, a LËK Network publication. It uses the founder's logo package
  (`public/brand/lek-info`); the hare emblem and the two gold dots are unchanged.
- New group page `/group` for LËK Network. No URL changed. `Programme.division` lets future LËK Media programmes
  leave LËK Info without duplication.
- Verified on `staging` (commit aff8741, identical to the tested 67a6971): CI 90 screenshots, 204 audited page loads, all checks; community
  95/95. The public site (`main`) is unchanged.
- Details, changed references and remaining work: `docs/BRAND-MIGRATION.md`.

## Verification log
- **CI run 42067676472 (commit cbae15c): passed.**
  - Type check, lint and production build passed.
  - 85 screenshots, plus 192 audited page loads at 320/375/430/768px: no overflow, broken images, console errors or failed requests.
  - The ident plays on Live (26 running animations). Under reduced motion it is present, static and has no replay button.
  - The three motion files are served (HTTP 200).
  - All earlier checks still pass: logo, menu, focus, language switching, anchors and search.

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
