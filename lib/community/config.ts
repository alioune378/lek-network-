/**
 * LËK Community configuration. Server-only values are read lazily so that production
 * (COMMUNITY_MODE unset = "off") never needs a database or secrets.
 * Relative imports only in lib/community: these files are also loaded by Node scripts.
 */
export type CommunityMode = 'off' | 'demo' | 'live';

export function communityMode(): CommunityMode {
  const m = process.env.COMMUNITY_MODE;
  return m === 'demo' || m === 'live' ? m : 'off';
}

export const isEnabled = () => communityMode() !== 'off';

export function siteOrigin(): string {
  return (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Live mode refuses to run without every production dependency. */
export function assertLiveReady(): void {
  if (communityMode() !== 'live') return;
  const missing = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'RESEND_API_KEY', 'MAIL_FROM', 'TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`COMMUNITY_MODE=live but missing: ${missing.join(', ')}`);
}

export const LIMITS = {
  commentMax: 4000,
  bioMax: 280,
  displayNameMax: 50,
  feedbackMax: 6000,
  pageSize: 20,
  editWindowHours: 72,
};
