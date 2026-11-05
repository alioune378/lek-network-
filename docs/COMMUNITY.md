# LËK Community — architecture, security and operations

*Votre voix compte.* This document is the Phase 1 plan and the operating reference for the community system.

## 1. What existed before (inspection, Nov 2026)

- Next.js 15 (App Router) + next-intl, deployed on Netlify (`@netlify/plugin-nextjs`). Article and programme pages are statically generated for 10 locales.
- **No database and no authentication.** The only "persistence" was the newsroom demo, which stores data in the visitor's browser (`localStorage`). This is not acceptable as a source of truth for users or comments, and the community system does not use it.
- API routes (`/api/*`) are outside the locale middleware.

## 2. Choices

| Need | Choice | Why |
|---|---|---|
| Database | **PostgreSQL** (production: Netlify DB / Neon, or any managed Postgres reachable from Netlify Functions; CI: Postgres 16 container) | Relational constraints (unique usernames, one reaction per member, one appeal per action), transactions, mature hosting compatible with Netlify. |
| Data access | `pg` with **parameterised SQL only** (`lib/community/db.ts`) | No string-built SQL anywhere; injection-safe by construction. |
| Authentication | **Better Auth** (email + password, username plugin, email verification, password reset, database sessions, built-in rate limiting) | Proven open-source framework; password hashing, session cookies and CSRF origin checks are the library's, not ours. **No custom cryptography or password storage.** |
| Anti-bot | Cloudflare **Turnstile** (verified server-side on registration, login, password reset and feedback when keys are set) + honeypot field + rate limits | Privacy-respecting, no tracking cookies. |
| Email | Transactional provider via HTTP API (**Resend** supported in code; any provider can be added in `lib/community/mail.ts`) | Verification and reset emails. In the CI/demo environment, mail is *captured* in a database table and never sent. |

## 3. Modes (feature flag `COMMUNITY_MODE`)

| Mode | Where | Behaviour |
|---|---|---|
| `off` (default, **production today**) | leknetwork.netlify.app | No database is touched. Comment areas and account pages show "LËK Community is being prepared". APIs answer `503 community_disabled`. Reading is unaffected. |
| `demo` | CI and a separate preview deploy | Full system with a test database. A permanent banner says it is a test environment, data may be erased, and no real personal data should be entered. Emails are captured, not sent. |
| `live` | Production, **only after** the launch checklist (§10) | Refuses to start unless `DATABASE_URL`, `BETTER_AUTH_SECRET`, a mail provider key, and Turnstile keys are all present. |

## 4. Data model (`db/migrations/001_community.sql`)

Better Auth owns `user`, `session`, `account`, `verification`, `rateLimit` (created by its migration tool; `user.username` is unique and normalised to lower case by the username plugin).
LËK tables:

- `profile` — display name, bio, country/region, preferred language, interests, privacy preferences (`show_history`), reply notifications, `deleted_at`. One per user.
- `staff` — professional verification, separate from email verification: role (`journalist`, `editor`, `moderator`, `admin`), title, who verified, when. Staff badges come **only** from this table.
- `article` — slug + kind (`article`/`programme`), comments open/closed. Slugs are checked against the published content.
- `comment` — author (`user_id`, NOT NULL, kept even when the comment is deleted), article, parent (one level of replies; deeper replies attach to the thread's top comment), body (plain text, 1–4,000 characters), language, status (`published`, `pending`, `removed`, `deleted`), staff note flag, `edited_at`, idempotency key (unique per author).
- `comment_revision` — previous text on every edit (moderation history; never public).
- `reaction` — "helpful" only; primary key (comment, member) prevents duplicate votes; members cannot mark their own comments.
- `report` — reader reports (one per member per comment) and automatic detections.
- `moderation_case` — the queue: comment, source, reasons, context (rule hits, never an "AI verdict"), severity, status, reviewer, action, decision note, decision time, appeal status.
- `moderation_action` — **append-only audit log** (a trigger rejects UPDATE/DELETE): notices, warnings, removals, restorations, restrictions, suspensions, escalations.
- `restriction` — active commenting restrictions and suspensions, with end dates.
- `appeal` — one per moderation action; reviewed by a different moderator where possible.
- `notification` — in-app notices (replies, moderation decisions, appeal outcomes, newsroom replies).
- `feedback` + `feedback_reply` — "Votre voix compte": private submissions to the newsroom. Never shown publicly.
- `mail_outbox` — demo/CI: captured emails; production: delivery status and provider id only (no message body).
- `rate_event` — application rate limits (comments, reports, reactions, feedback).

## 5. Security

- **Sessions**: Better Auth database sessions, `HttpOnly`, `Secure` (HTTPS), `SameSite=Lax` cookies.
- **CSRF**: Better Auth checks the request origin on its endpoints; every LËK mutating endpoint requires a same-origin `Origin` header and a JSON body.
- **Authorisation** is enforced on the server for every action (`lib/community/permissions.ts`); the interface only hides what the server would refuse anyway.
- **XSS**: comments are plain text. React escapes all output; no user HTML is ever rendered. Links are shown as text with the domain; only `http(s)` links become clickable, with `rel="nofollow ugc noopener noreferrer"`. Suspicious links are never clickable.
- **SQL injection**: parameterised queries only.
- **Account enumeration**: registration always answers "check your inbox" (an existing address receives a "someone tried to register" email instead); password-reset requests always answer the same; login errors are generic. Username availability is public by nature (usernames are public).
- **Mass registration / spam**: Turnstile, honeypot, per-IP and per-account rate limits, new-account link limits, duplicate detection.
- **Privacy**: email addresses are never returned by any public endpoint or rendered on any public page. IP addresses are stored only as salted hashes for rate limiting and expire with `rate_event` rows.
- Security headers (`netlify.toml`): `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.

## 6. Moderation

**Deterministic checks** (`lib/community/moderation.ts`, unit-tested): too many links, link shorteners and raw-IP links, promotional patterns, phone numbers and email addresses (private information), mass duplicates (same text by one member, or by several members within an hour), new-account link posting, explicit threats (FR/EN/AR/WO list), impersonation of staff or the newsroom in names, repeat offenders (pre-moderation).

**Outcomes**: *publish*, *hold for human review* (visible to the author as "awaiting review"), or *reject* — rejection only for obvious technical abuse (link floods, exact duplicate floods). Nothing is removed automatically for its opinion. There is **no political-content scoring** and no list of political words.

**AI** (optional, off by default): if `MODERATION_AI_URL` is configured, it can add a *contextual risk note* to a case. It never publishes, holds or removes on its own, and the interface labels it "automated assessment — not proof".

**Queue**: comment, source (reader report / automatic), reasons, context, severity, reviewer, action, decision time, appeal status. Moderators can restore any removed comment.

## 7. Graduated accountability

1. Educational notice · 2. Formal warning · 3. Comment removal · 4. Temporary commenting restriction (24 h / 7 days) · 5. Account suspension (30 days / indefinite) · 6. Serious-violation escalation (editor-in-chief / legal).

Proportionate: the console shows the member's history and suggests the next step, but moderators can go straight to the level the conduct warrants (e.g. threats). Every action records a reason shown to the member, and every action can be appealed once. There is no hidden reputation score.

## 8. Reader feedback ("Votre voix compte")

Categories: article feedback, factual error, story idea, editorial question, technical problem, private concern. Private by design: stored in `feedback`, visible only to staff in the newsroom inbox (status, assignee, resolution notes, replies). Replies go to the member's notifications (or by email when a provider is configured and the sender left an address).

**Sensitive tips must not use this form.** The page says so and points to a secure channel, which is **not set up yet** (to be decided: SecureDrop or Signal with a dedicated number). No address is invented.

## 9. Retention (proposal — subject to legal review, see §10)

- Public comments: kept while the account exists. Deleted by the author: text hidden immediately, kept internally 90 days for moderation, then erased.
- Account deletion: sessions and credentials deleted immediately; email and names replaced with placeholders; comment texts hidden ("deleted account"); the internal link between comments and the account is kept 12 months for moderation and legal requests, then erased.
- Moderation records and appeals: 24 months. Feedback: 24 months, or earlier on request. Rate-limit records: 48 hours. Captured demo mail: erased with the demo database.

## 10. Launch checklist (before `COMMUNITY_MODE=live`)

1. Managed Postgres provisioned (e.g. Netlify DB), backups on, `DATABASE_URL` set **for the production context only**; migrations run (`npm run community:migrate`).
2. `BETTER_AUTH_SECRET` (32+ random bytes) and `BETTER_AUTH_URL` set.
3. Email provider account + verified sending domain (SPF, DKIM, DMARC); `RESEND_API_KEY`, `MAIL_FROM`.
4. Turnstile keys (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).
5. First admin granted with `npm run community:grant-staff`.
6. **Privacy review** for Senegal (Loi n° 2008-12 sur la protection des données à caractère personnel; declaration to the CDP — Commission de Protection des Données Personnelles) and for EU/UK readers (GDPR); privacy page and retention policy approved.
7. Community guidelines approved by the editor-in-chief; Wolof terminology reviewed by a native speaker.
8. Secure tip channel decided and published.
9. Acceptance suite green against the preview environment.

## 11. Phases

1. Inspect and plan (this document). 2. Registration, login, verification, profiles. 3. Comments, replies, edits, reactions, reports. 4. Moderation queue, restrictions, appeals, audit. 5. Feedback inbox and journalist participation. 6. Localisation, security/accessibility/responsive tests, deployment validation.

## 12. Verification (what was actually run)

- **Unit tests** (`npm run test:community`): 12/12. Covered: sharp political criticism, satire and criticism of LËK are never flagged; threats (FR/EN/AR/WO) are held at critical severity; private information is held; link floods and dangerous links are rejected; shorteners are held; duplicates and coordinated posting are caught; the ladder is proportionate; impersonation is blocked.
- **Acceptance suite** (`scripts/community/acceptance.mjs`, GitHub Actions `community.yml`, real Postgres 16, `next start` production build): **61/61**. It covers every acceptance criterion in the brief, plus:
  - the closed raw sign-up endpoint, the CSRF origin check, XSS rendered as text, and idempotent posting;
  - restoring removed content, the append-only audit log, and rate limiting;
  - the newsroom inbox's honest reply channels, staff notes, keyboard reply focus, and account deletion;
  - FR/EN/AR at 320–1280px without overflow;
  - existing pages (home, Watch, Live, programme, search) still working.
- **Not yet tested**: real email delivery (no provider configured), Turnstile (no keys), behaviour on Netlify Functions against a managed database (no preview database yet), and load/performance.
