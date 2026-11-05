/**
 * LËK Community configuration. Server-only values are read lazily so that production
 * (COMMUNITY_MODE unset = "off") never needs a database or secrets.
 * Relative imports only in lib/community: these files are also loaded by Node scripts.
 *
 * Modes:
 *   off   — public site today. No database, no accounts; comment areas say "being prepared".
 *   demo  — CI / throwaway test data. Emails may be captured instead of sent.
 *   pilot — private staging with real invited testers. Registration is by invitation only.
 *   live  — public launch, only after founder approval and the launch checklist.
 */
export type CommunityMode = 'off' | 'demo' | 'pilot' | 'live';
export type RegistrationMode = 'closed' | 'invite' | 'open';

export function communityMode(): CommunityMode {
  const m = process.env.COMMUNITY_MODE;
  return m === 'demo' || m === 'pilot' || m === 'live' ? m : 'off';
}

export const isEnabled = () => communityMode() !== 'off';

/**
 * Who may create an account. Defaults to "closed". "open" (public registration) is refused unless the
 * mode is live AND the founder's explicit approval is recorded in COMMUNITY_OPEN_APPROVED.
 * Invitations that carry a staff role (founder bootstrap, staff) work in every mode except off.
 */
export function registrationMode(): RegistrationMode {
  const r = process.env.COMMUNITY_REGISTRATION;
  if (r === 'open') return communityMode() === 'live' && /^approved-by-founder-\d{4}-\d{2}-\d{2}$/.test(process.env.COMMUNITY_OPEN_APPROVED ?? '') ? 'open' : 'invite';
  return r === 'invite' ? 'invite' : 'closed';
}

/** Netlify Database exposes NETLIFY_DB_URL; any other Postgres can be given as DATABASE_URL. */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || '';

export function siteOrigin(): string {
  return (process.env.BETTER_AUTH_URL || process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Extra trusted origins (comma-separated), e.g. the staging site's permalink domain. */
export const trustedOrigins = () => [siteOrigin(), ...(process.env.COMMUNITY_TRUSTED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)];

export const isStaging = () => process.env.LEK_ENV === 'staging';

/** Staff powers require two-step verification (TOTP) unless explicitly disabled (never in pilot/live). */
export const staffNeeds2fa = () => !(process.env.COMMUNITY_STAFF_2FA === 'off' && communityMode() === 'demo');

/** Staff powers require a session signed in within this many hours. */
export const STAFF_SESSION_HOURS = 12;

/** Emails may be captured in the database (never sent) outside live mode when MAIL_CAPTURE=1. */
export const mailCapture = () => process.env.MAIL_CAPTURE === '1' && communityMode() !== 'live';
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export function missingConfig(): string[] {
  const mode = communityMode();
  if (mode === 'off') return [];
  const missing: string[] = [];
  if (!databaseUrl()) missing.push('DATABASE_URL or NETLIFY_DB_URL');
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) missing.push('BETTER_AUTH_SECRET (32+ characters)');
  if (mode === 'pilot' || mode === 'live') {
    if (!mailConfigured() && !mailCapture()) missing.push('RESEND_API_KEY + MAIL_FROM');
    if (!process.env.BETTER_AUTH_URL) missing.push('BETTER_AUTH_URL');
  }
  if (mode === 'live') {
    if (!mailConfigured()) missing.push('RESEND_API_KEY + MAIL_FROM');
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) missing.push('TURNSTILE keys');
    if (process.env.MAIL_CAPTURE === '1') missing.push('MAIL_CAPTURE must be unset');
  }
  return missing;
}

/** Pilot and live refuse to serve community requests with incomplete configuration. */
export function assertReady(): void {
  const m = missingConfig();
  if (m.length) throw new Error(`LËK Community (${communityMode()}) is missing: ${m.join(', ')}`);
}
/** @deprecated kept for older imports */
export const assertLiveReady = assertReady;

export const LIMITS = {
  commentMax: 4000,
  bioMax: 280,
  displayNameMax: 50,
  feedbackMax: 6000,
  pageSize: 20,
  editWindowHours: 72,
};

export const PRIVACY_VERSION = '2026-11-pilot';
