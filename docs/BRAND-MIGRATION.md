# LËK brand migration: phase 1 (LËK Network → LËK Info)

Status: done on the `staging` branch. **Not on the public site.** `main`, which deploys
leknetwork.netlify.app, is unchanged. Merge `staging` into `main` only after founder approval.

## Confirmed architecture (founder, 2026-11-05)

| Brand | Role | On this site |
|---|---|---|
| **LËK Network** | Parent company. Owns the motto "Toujours un temps d’avance." | Group page `/group`; named as publisher in the top strip and footer |
| **LËK Info** | The news publication: articles, categories, regions, LËK Watch, LËK Live, Originals, search, LËK Community | The whole site |
| **LËK Media** | Future entertainment, culture and digital programming division | Not launched. The content model can assign programmes to it (below) |
| **LËK Productions** | Future professional production division (documentaries, film, commercial work) | Not launched. The group page points to the current LËK Studios page |

## Logo assets

From the founder's package `LEK_Info_Website_Logo_Package.zip`. No logo was created or redrawn.

| File in `public/brand/lek-info/` | Origin | Used for |
|---|---|---|
| `lek-info-horizontal-light.svg`, `lek-info-horizontal-dark.svg` | package, unchanged | archive / future use |
| `lek-info-horizontal-light-web.svg` | package file, **viewBox only** trimmed to the artwork (`24 16 976 382`) | site header (white background), group page, 404 page |
| `lek-info-horizontal-dark-web.svg` | same, dark version | mobile menu (navy background) |
| `lek-info-stacked-light.svg`, `lek-info-stacked-dark.svg` | package, unchanged | archive / future use |
| `lek-info-stacked-dark-web.svg`, `lek-info-stacked-light-web.svg` | package file, viewBox only trimmed (`240 48 524 842`) | footer (navy background) |
| `lek-info-icon-light.svg`, `lek-info-icon-dark.svg` | package, unchanged; the hare paths are identical to the approved LËK Network emblem | — |
| `lek-info-icon-light.png` (1024 × 1024) | package, unchanged | Apple touch icon, social-share image |
| `PACKAGE-README.txt` | package README | — |

- Package naming: "light" = for light backgrounds (navy lettering); "dark" = for dark backgrounds (white lettering).
- Why trimmed copies: the package's horizontal canvas is 1600 wide, but the artwork ends at x ≈ 970. Used as is,
  the header logo would carry about 40% empty space. Only the visible frame changed: same paths, colours, hare, and
  the two gold dots above the Ë.
- Kept, not deleted: the LËK Network logo files in `public/brand/` (`lek-horizontal-*.svg`, `lek-icon-*`). They
  are the parent brand's assets, and the broadcast ident is built from them.
- `favicon.ico` was not changed. It already shows the same hare emblem.
- Paths are centralised in `lib/brand.ts` (`LOGO`, `PUBLICATION`, `PARENT`, `DIVISIONS`).

Points from the package README for a final brand release (not fixed here, by instruction not to create a
replacement logo):
- The source logo was automatically traced. Check the accent, kerning and proportions before print or trademark
  filing.
- In the stacked version, "INFO" sits left of centre under "LËK".
- The horizontal logo's "BY LËK NETWORK" line is live text in Arial. It renders in whatever Arial-like font the
  visitor's device has; outlining it as paths would make it identical everywhere.

## Changed brand references

| Where | Before | After |
|---|---|---|
| Browser title (all pages) | `… · LËK Network` | `… · LËK Info` |
| Home title (9 languages) | `LËK Network — Toujours un temps d’avance` (translated) | `LËK Info — Actualité du Sénégal, de l’Afrique et de la diaspora` (translated) |
| Meta description (fr, en, ar) | "Média indépendant sénégalais…" | "LËK Info, le média d’information de LËK Network…" |
| Social share `og:site_name` / image | LËK Network / `lek-icon-512.png` | LËK Info / `lek-info/lek-info-icon-light.png` |
| Apple touch icon | `lek-icon-512.png` | `lek-info/lek-info-icon-light.png` (same hare) |
| Header logo + label | LËK Network horizontal (navy) | LËK Info horizontal (light-background version) |
| Mobile menu logo | LËK Network horizontal (white) | LËK Info horizontal (dark-background version) |
| Top strip | the motto "Toujours un temps d’avance." | "Un média de LËK Network" (translated), linking to `/group` |
| Footer logo | LËK Network horizontal | LËK Info stacked (dark-background version) |
| Footer line under the logo | the motto | "Un média de LËK Network", linking to `/group` |
| Footer column heading | "LËK Network" | "LËK Info", plus a new link "Le groupe LËK Network" |
| Footer copyright | © LËK Network | unchanged (the company holds the rights) |
| Article illustration credit | LËK Network | LËK Info |
| 404 page logo | LËK Network | LËK Info |
| Community emails (verification, invitation; fr/en/ar) | signed "LËK Network — Toujours un temps d’avance." / "LËK Network" | "LËK Info · un média de LËK Network" / "LËK Info · LËK Network" |
| Reserved usernames | lek, leknetwork, lekstudios, lekwatch, leklive… | also lekinfo, lek_info, lekmedia, lek_media, lekproductions, lek_productions |
| Code comments | "LËK Network — …" | "LËK Info — …" |

Intentionally unchanged:
- **Founder staff title** "Fondateur, LËK Network": the founder founded the company.
- **Broadcast ident** (Live page when off air, and programme posters marked `brandPoster`): the group's motion
  identity, built from the LËK Network logo and motto. It is still labelled as the LËK Network ident.
- **Credits page text** "illustrations made for LËK Network": the company commissioned them.
- **LËK Studios** name and page: still the current production offer; the group page links to it under LËK
  Productions.

## Routes

- **No existing URL changed.** Articles, categories, regions, Watch, programmes, Live, Originals, Studios,
  community, account and moderation addresses are identical, so no redirects were needed. Search engines see the
  same URLs with new titles.
- **New:** `/{locale}/group`, the LËK Network group page. It covers the motto, the three divisions with an honest
  status (LËK Info live; LËK Media and LËK Productions "in preparation"), a link to LËK Studios, and a note that
  the names are under trademark review.
- Redirects become necessary in phase 3 (domains). They will be permanent (301) and listed in this file.

## Content architecture for LËK Media

- `Programme.division?: 'info' | 'media' | 'productions'` (default `info`).
- `ALL_PROGRAMMES` holds every programme; `PROGRAMMES` (used by every page, the Watch and Originals listings,
  programme pages, the home page, the newsroom and community comments) holds only this site's division
  (`SITE_DIVISION = 'info'`).
- Setting `division: 'media'` on a programme removes it from LËK Info automatically, so it is never published
  twice. `PROGRAMMES_ELSEWHERE` lists such programmes for future redirects to the LËK Media site.
- All current programmes, including the news-related Originals, stay in LËK Info.

## Unchanged by design

- LËK Community (accounts, comments, moderation, appeals, feedback, pilot), the staging configuration and its
  environment variables, the editorial workflow (`/newsroom`), article URLs and page structure.
- Public registration stays off (`COMMUNITY_REGISTRATION=invite` on staging; community off in production).

## How it was tested

Both CI workflows now also run on the `staging` branch, and publish to separate result branches:
- `ci-artifacts-staging`: the public-site build, with every page in fr/en/ar at phone and desktop sizes, the
  rendered-page audit, and new brand checks (title, site name, header logo, publisher line, footer logo).
- `ci-community-staging`: the full pilot acceptance suite, plus a check that community emails carry the new
  signature.

The staging Netlify site is not linked yet (see `docs/STAGING.md` §2), so the testing so far is CI on the
`staging` branch, not a live staging URL.

## Remaining work

- [ ] Founder reviews the staging screenshots, then approves merging `staging` into `main` (phase 2, public site).
- [ ] Choose a LËK Info tagline. For now the strip says "Un média de LËK Network"; the motto belongs to the group.
- [ ] Translate the group page and meta description into wo, es, de, it, pt, tr, zh (they fall back to
      French/English).
- [ ] An LËK Info version of the broadcast ident, if wanted (re-render with `brand.yml` from the new artwork).
- [ ] Final logo QA from the package README (traced artwork, stacked "INFO" alignment, Arial text in the
      horizontal logo).
- [ ] Decide whether LËK Studios is renamed LËK Productions, and when.
- [ ] Privacy page and community rules: name the legal entity (LËK Network company details) once confirmed.
- [ ] Trademark search before domains (phase 3).
