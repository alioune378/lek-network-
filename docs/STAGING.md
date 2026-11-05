# LËK Community — private pilot on staging

Status (2026-11-05): the code is ready and tested in CI in the exact pilot configuration. The staging site
**leknetwork-staging** exists on Netlify with team-login protection and the non-secret settings below, but it is
**not working yet**: it has no linked repository, no database and no secrets. Nothing here claims that email
delivery or bot protection works on staging. That is only proven once the end-to-end test in §5 passes.

The public site **leknetwork.netlify.app** is unchanged. The community stays off there (`COMMUNITY_MODE` unset),
and no database is attached to it.

---

## 1. Architecture and isolation

| | Public site `leknetwork` | Private staging `leknetwork-staging` |
|---|---|---|
| Community | off | `pilot` (invitation only) |
| Database | none | its own Netlify Database (Postgres) |
| Access | public | Netlify team login (SSO) for every deploy; switch to a password for testers (§4) |
| Crawlers | as today | `X-Robots-Tag: noindex, nofollow, noarchive` on every response; `robots.txt` disallows all |
| Deploys from | `main` | branch `staging` (advance it only when you want to test a version) |

- **Separate sites mean separate data.** The two sites share nothing. The staging database only ever holds
  pilot testers' data, so no real member data from production can reach a preview.
- **Deploy previews of staging** get a database branch that copies staging data (Netlify behaviour). They sit
  behind the same team-login protection. The auth URL is set to the main staging address, so sign-in works only on
  `https://leknetwork-staging.netlify.app`, not on preview URLs.
- `@netlify/database` is deliberately **not** installed. Installing it would auto-provision a database on every
  site that deploys this repository, including the public site. The code connects with `pg` through
  `NETLIFY_DB_URL`, which Netlify injects once a database is created for the site.
- **Migrations** run at build time (`npm run build:netlify` → `scripts/community/prebuild.mjs`). They create the
  Better Auth tables, then `db/migrations/*.sql` once each, recorded in `community_migrations`. With the community
  off, this step does nothing.
- **Build safety checks.** The build fails if the community is on but no database is attached. It also fails if
  `COMMUNITY_MODE=demo`, `MAIL_CAPTURE` or `TEST_MAIL_TOKEN` is set on a Netlify site.

## 2. Setup steps for the founder (in order)

**A. Link the repository to the staging site**
1. Create the branch `staging` from `main` on GitHub. (Claude has already created it, pointing at the tested
   commit.)
2. In Netlify, open leknetwork-staging, then Project configuration > Build & deploy > Link repository. Choose
   GitHub `alioune378/lek-network-`.
3. Set the production branch to `staging`. The build command comes from `netlify.toml`
   (`npm run build:netlify`).
4. Set "Deploy previews" to "None" (or keep them, knowing they cost credits; §7).

**B. Create the staging database**
1. In leknetwork-staging, open Data & Storage > Database and create a database.
2. Keep **sleep on inactivity at 5 minutes**. Do not choose "Always on" (cost, §7).
3. Check that the `NETLIFY_DB_URL` environment variable now exists. Do not copy it anywhere else.

**C. Resend (transactional email) with a LËK-controlled domain**
1. Create a Resend account with a LËK address.
2. Add a sending subdomain you control, for example `mail.<your-domain>`. Use a subdomain so it does not affect
   the main domain's email.
3. At your DNS provider, add the records Resend shows:
   - SPF (TXT, and the MX record for the bounce subdomain);
   - DKIM (TXT `resend._domainkey…`).
   Add a DMARC record (`_dmarc` TXT, starting with `v=DMARC1; p=none; rua=mailto:<your address>`).
4. Wait until Resend shows the domain as **Verified**.
5. Create an API key with "Sending access" restricted to that domain.

**D. Cloudflare Turnstile**
1. In Cloudflare, open Turnstile and add a widget.
2. Hostname: `leknetwork-staging.netlify.app`. Mode: Managed.
3. Copy the **site key** (public) and the **secret key** (secret).

**E. Secrets (Netlify > leknetwork-staging > Environment variables; tick "Contains secret values")**

Generate the random values on your own computer with `openssl rand -hex 32`. Never paste them into a chat, an
email or a ticket.

| Variable | Value | Secret? |
|---|---|---|
| `BETTER_AUTH_SECRET` | 64 random hex characters | **yes** |
| `BOOTSTRAP_TOKEN` | 64 random hex characters (different from the one above) | **yes** |
| `FOUNDER_EMAIL` | the founder's own mailbox | yes (private) |
| `RESEND_API_KEY` | from step C | **yes** |
| `MAIL_FROM` | `LËK Community <communaute@mail.<your-domain>>` | no |
| `TURNSTILE_SECRET_KEY` | from step D | **yes** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | from step D | no (public by design) |
| `NEXT_PUBLIC_PILOT_END_DATE` | e.g. `2026-12-15` (shown in the consent text) | no |

Already set by Claude (non-secret):

| Variable | Value |
|---|---|
| `COMMUNITY_MODE` / `NEXT_PUBLIC_COMMUNITY_MODE` | `pilot` |
| `COMMUNITY_REGISTRATION` / `NEXT_PUBLIC_COMMUNITY_REGISTRATION` | `invite` |
| `LEK_ENV` / `NEXT_PUBLIC_LEK_ENV` | `staging` |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | `https://leknetwork-staging.netlify.app` |

Never set these on staging or production: `MAIL_CAPTURE`, `TEST_MAIL_TOKEN`, `COMMUNITY_STAFF_2FA`,
`COMMUNITY_OPEN_APPROVED`.

**F. Deploy.** Trigger a deploy of `staging`. In the deploy log, check for:
- `[community] … migration` lines;
- no "missing" errors.

If a variable is missing, community pages answer "community unavailable" (HTTP 503). The server log names the
missing variable; the page never shows it.

## 3. Founder administrator: activation and recovery

**Activation (once):**
1. Sign in to Netlify, then open `https://leknetwork-staging.netlify.app/fr/admin/bootstrap`.
2. Paste `BOOTSTRAP_TOKEN`. The server compares it in constant time.
3. A single-use invitation, valid 48 hours, is emailed to `FOUNDER_EMAIL`. The page shows only a masked address.
   The link is never displayed or logged.
4. Open the email and register with exactly that address. Confirm the address with the verification email.
5. In "Mon compte", turn on **two-step verification**:
   - scan the QR code with an authenticator app;
   - enter the code;
   - **store the backup codes offline**.
   Until then, every staff power answers `two_factor_required`.
6. The bootstrap then closes for good (`already_bootstrapped`). Delete the `BOOTSTRAP_TOKEN` variable afterwards.

If you request the bootstrap again before registering, the earlier link is revoked. If the email service refuses
the message, no invitation is kept and the page says so (`mail_unavailable`).

**Rules that always apply to staff:**
- verified email, no restriction, two-step verification on;
- a sign-in less than 12 hours old (otherwise: sign out and back in);
- sensitive account changes need a sign-in less than 15 minutes old;
- only the owner grants or removes admin/owner, admins manage roles below admin, and nobody changes their own
  role.

**Recovery:**
- Forgotten password: "Mot de passe oublié" sends a reset link (all sessions are signed out after a reset). Two-step
  verification still applies at the next sign-in.
- Lost phone: sign in, then use one of the backup codes, then set up two-step verification again.
- Lost phone **and** backup codes, or lost mailbox (break-glass). An operator with direct database access runs, from
  a trusted computer:
  `DATABASE_URL=<staging connection string> npx tsx scripts/community/grant-staff.mjs <username> owner "Fondateur, LËK Network"`.
  Then, in the database, set `"twoFactorEnabled" = false` for that user and delete their `twoFactor` row, so they can
  enrol a new phone. Every use is written to the audit log (`grant_staff`, actor = operator script). Keep the
  connection string out of chats and tickets.

## 4. Running the pilot (10–20 invited testers)

1. Open access for testers. In Netlify > leknetwork-staging > Access & security > Visitor access, switch from team
   login to **Password protection**, using a password you choose. Send it separately from the invitation, by phone
   or in person.
2. In Modération > **Invitations**, create one link per tester (14-day validity). You can tie a link to a tester's
   email address, which sends it to them. Links are shown **once**; give each link to one person.
3. Testers follow the guide on `/fr/pilot` (also `/en/pilot`, `/ar/pilot`) and fill in the questionnaire. It covers:
   - the tasks they tried;
   - seven 1–5 ratings;
   - a four-question comprehension check on email privacy, what a report does, who reviews an appeal, and whether
     disagreement is allowed;
   - free text.
4. Editors and above see results in Modération > **Pilote**: averages, the share of correct answers per question,
   task counts, and free text without names.
5. Languages:
   - the interface is complete in French, English and Arabic (RTL);
   - comments in Wolof are stored and shown exactly;
   - **the Wolof interface is not translated** (it falls back to French).
   Ask at least two testers to write in Wolof and two to use the Arabic interface.
6. At the end of the pilot, either keep the data or delete the staging database. Testers agreed that it may be
   erased.

## 5. End-to-end verification still to do on staging (founder + Claude)

These cannot be done in CI. CI uses Cloudflare's test keys and captures emails instead of sending them.

- [ ] The bootstrap email arrives in the founder's inbox (Resend dashboard shows "Delivered").
- [ ] The verification email, a password-reset email and a tester invitation each arrive; links open on staging.
- [ ] Emails are not flagged as spam in Gmail and Outlook; SPF, DKIM and DMARC show "pass" in the message headers.
- [ ] The Turnstile widget appears on register, sign-in and forgot-password. Registration fails when the widget is
      removed or the token is reused.
- [ ] Two-step verification is set up with a real phone. Signing in again asks for the code.
- [ ] A tester from another network registers, comments, reports and appeals.
- [ ] `curl -I https://leknetwork-staging.netlify.app/fr` without login returns 401 or the Netlify login page,
      never the site.

Only after these pass may anyone say that email delivery or bot protection is operational.

## 6. Test results (CI)

The workflow `.github/workflows/community.yml` builds with the pilot configuration and runs:
- unit tests;
- the type check and lint;
- migrations, applied twice to show they are idempotent;
- `scripts/community/acceptance.mjs` against Postgres 16, with Chromium.

Results and screenshots are published to the `ci-community` branch. See PROJECT_STATUS.md for the latest run.

## 7. Monthly costs (estimates; check the Netlify billing page)

| Item | Price | Pilot estimate |
|---|---|---|
| Netlify Pro (already paid) | from $20/month, includes 3,000 credits; extra $10 per 1,500 | — |
| Netlify Database compute | 10 credits per compute-unit-hour while awake (idle time before sleep counts) | 2–5 h awake per day → 600–1,500 credits/month. **"Always on" ≈ 7,200 credits/month: avoid.** |
| Database bandwidth | 20 credits/GB | < 1 GB → < 20 credits |
| Database storage | free until 1 July 2026; Netlify said rates would be announced in advance | check current rate; pilot data is a few MB |
| Builds | 15 credits per production deploy, **per site** | 20 staging deploys → 300 credits (why staging deploys from its own branch) |
| Functions / requests | 10 credits per GB-hour; 2 credits per 10,000 requests | small for 20 testers |
| Resend | Free: 3,000 emails/month, 100/day; Pro $20/month for 50,000 | free tier is enough for the pilot |
| Cloudflare Turnstile | free | 0 |
| Domain for email | about $10–20/year if a new one is needed | — |

The pilot should fit inside the 3,000 included credits if staging deploys are kept rare and the database sleeps.
Public launch costs depend on traffic. Re-estimate from the pilot's actual usage meters.

## 8. Known risks and outstanding work

- Email delivery and Turnstile with real keys are unverified until §5 is done.
- Wolof interface not translated; moderation word lists have little Wolof coverage. Wolof abuse is mostly caught by
  reports and human review.
- Data clean-up (expired sessions, IP-bearing rate-limit rows after 48 h) runs opportunistically during traffic,
  not on a schedule. Add a scheduled function before launch.
- Moderators must cover the pilot hours. Nothing is published without review once it is held, so an unstaffed
  queue means delays.
- The privacy page is still a working document. A validated policy is needed before launch: data controller,
  retention periods, rights, Senegalese law (CDP).
- Database cold start after sleep adds a few seconds to the first request.
- Backups: check Netlify Database backup and restore options before relying on staging data.
- A single founder owner: appoint a second owner or admin you trust, with two-step verification, to avoid lock-out.

## 9. Launch checklist (public community; requires the founder's explicit approval)

- [ ] §5 fully passed on staging; pilot questionnaire reviewed; comprehension of each question ≥ 80%, or the text
      fixed.
- [ ] Privacy policy and community rules validated (legal review); retention policy published.
- [ ] Moderation staffing and response times agreed; at least two people with admin rights, both using two-step
      verification.
- [ ] Production database created on `leknetwork` (sleep on inactivity), with the same secrets regenerated (never
      reused from staging).
- [ ] `COMMUNITY_MODE=live` with `COMMUNITY_REGISTRATION=invite` first.
- [ ] Open registration **only** when the founder sets `COMMUNITY_REGISTRATION=open` and
      `COMMUNITY_OPEN_APPROVED=approved-by-founder-YYYY-MM-DD`. Without both, the code keeps registration
      invitation-only.
- [ ] Scheduled clean-up job; monitoring of 5xx errors and the moderation queue.
- [ ] Wolof interface translated by a native speaker, or clearly labelled as partial.
