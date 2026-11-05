# LËK Network

*Toujours un temps d’avance.*

Prototype of LËK Network: an independent Senegalese media platform for news, documentaries, interviews, live broadcasting and commercial production (LËK Studios). Built on Next.js (App Router) with next-intl, in ten languages.

> **Everything published here is fictional demonstration content.** No article reports a real event; photographs are freely licensed pictures of places, captioned as illustrations unrelated to the stories; no video or live stream exists yet. See “Simulated features” below.

## Run

Requires Node.js 20.9+ (22 recommended).

```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /fr (or the browser language)
npm run typecheck
npm run lint
npm run check:i18n   # translation coverage per language
npm run build && npm start
```

Copy `.env.example` to `.env.local` to configure the site URL and LËK Live.

## Continuous verification

`.github/workflows/ci.yml` runs on every push to `main`: install → translation coverage → type check → lint → production build → start the server → rendered checks with Playwright (screenshots of every main page in French, English and Arabic on mobile and desktop; horizontal overflow; console errors; failed requests; language switching on an article; search; mobile menu; 404). Logs, screenshots and the generated `package-lock.json` are pushed to the `ci-artifacts` branch.

## Deploy (Netlify)

Connect the repository in Netlify. `netlify.toml` sets `npm run build`, Node 22 and the `.next` publish directory; Netlify’s Next.js runtime handles the middleware (language routing) and server rendering.

## Structure

| Path | What |
|---|---|
| `app/[locale]/…` | Every page, under a language prefix (`/fr`, `/en`, `/ar`, …) |
| `i18n/` | next-intl routing, navigation and message loading |
| `messages/*.json` | Interface dictionaries (missing keys fall back: Wolof → French, others → English → French) |
| `lib/content.ts` | Editorial model: stories (per-language versions + review state), regions, programmes |
| `lib/live.ts` | Live status, driven by environment variables; never fakes a broadcast |
| `components/` | Header, language menu and suggestion, story cards, cover art, player, search, forms, newsroom |

## Languages

French (default), English and Arabic are the priority languages; Arabic renders right to left (`dir="rtl"`, logical CSS properties, Arabic typefaces loaded only on Arabic pages). Spanish, Portuguese, German, Italian, Turkish and Chinese have interface translations for the public pages, awaiting native review. **Wolof** has only a handful of proposed terms, marked for human review; everything else falls back to French.

Language behaviour:
- The root URL picks the browser’s language (Accept-Language), else French.
- On a first visit, if the browser prefers another supported language, a banner *suggests* it (in that language). Nothing switches automatically.
- Any explicit choice is remembered (`localStorage` + next-intl cookie) and never overridden.
- Switching language keeps the current page. An article shows its version in that language only if one exists; otherwise the original is shown with a notice. Unreviewed translations are labelled.
- Not implemented: coarse geographic hints (would require a server-side geo header).

## Simulated features (prototype)

| Feature | Status |
|---|---|
| Articles, regions, programmes | **Fictional demonstration content**, labelled on every page |
| LËK Community | Fully built and tested in CI against a real database, but **switched off on the public site** (`COMMUNITY_MODE` unset): comment areas show “being prepared”. Needs the production database, secrets, email provider and legal review listed in `docs/COMMUNITY.md` §10. A private, invitation-only pilot is prepared for a separate staging site: see `docs/STAGING.md`. |
| Brand motion | The ident is a v1 concept animation (brand graphics only). No programme footage exists. |
| Images | 22 freely licensed photographs from Wikimedia Commons (see `MEDIA_CREDITS.md` and `/credits`), each captioned as an illustration of a place, **not** evidence of the fictional story. One story keeps the brand’s abstract cover. Watch posters are location “mood” images, labelled as not coming from any programme |
| Privacy page | Describes what the prototype actually does; a full policy is required before launch |
| LËK Watch | Programme pages, seasons, episode slots, credits; **no video exists**. The player is ready for MP4/HLS and shows “not available yet” without a source |
| LËK Live | Shows *off air*. Becomes live only with `NEXT_PUBLIC_LIVE_STATUS=live` **and** a real `NEXT_PUBLIC_LIVE_HLS_URL` |
| Studios inquiry form | Validated in the browser; **not sent anywhere** (says so) |
| Newsroom (CMS) | Reached from the footer (“Prototype tools”), not from public navigation. Runs in the browser only (`localStorage`): drafts, review, approval, scheduling, “publish (demo)”, translation tracking, corrections, video metadata, simulated roles. **No authentication, no server, no shared data, nothing reaches the public site** |

## Before launch

1. Real journalism: replace the demonstration stories; licensed, credited photography.
2. A real CMS with authentication, server-side permissions and a database (the newsroom UI shows the intended workflow).
3. Video hosting and a live encoder (HLS); rights-cleared content; captions and transcripts.
4. Inquiry delivery (email or CRM) with a confirmed success message.
5. Native review of every dictionary, especially Wolof and Arabic.
6. Privacy policy and consent if any analytics are added (none are included).
7. A professionally redrawn logo master (the supplied SVGs are traced).
8. Remove `robots: noindex` in `app/[locale]/layout.tsx`.
