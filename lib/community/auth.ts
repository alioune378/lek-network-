import { betterAuth } from 'better-auth';
import { username, captcha, twoFactor } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { getPool } from './db';
import { siteOrigin, trustedOrigins } from './config';
import { sendMail } from './mail';
import { mailText } from './mailText';
import { validUsername } from './names';

/**
 * Better Auth: email + password (hashing by the library), mandatory email verification,
 * password reset, database sessions, username plugin, built-in rate limiting, Turnstile when configured.
 * No custom cryptography.
 */
function build() {
  const turnstile = process.env.TURNSTILE_SECRET_KEY;
  return betterAuth({
    appName: 'LËK Community',
    baseURL: siteOrigin(),
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(),
    database: getPool(),
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, defaultValue: 'fr', input: true },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        const m = mailText('reset', (user as { locale?: string }).locale, url);
        await sendMail({ to: user.email, kind: 'reset', ...m });
      },
      onExistingUserSignUp: async ({ user }) => {
        const l = (user as { locale?: string }).locale ?? 'fr';
        const m = mailText('existing_account', l, `${siteOrigin()}/${l}/account/login`);
        await sendMail({ to: user.email, kind: 'existing_account', ...m });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        const m = mailText('verify', (user as { locale?: string }).locale, url);
        await sendMail({ to: user.email, kind: 'verify', ...m });
      },
    },
    session: {
      // Members: 7 days, renewed daily. Staff powers additionally require a session younger than 12 h (lib/community/permissions.ts).
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Sensitive account operations (deletion, 2FA changes) need a sign-in younger than 15 minutes.
      freshAge: 60 * 15,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 600, max: 3 },
        '/send-verification-email': { window: 600, max: 3 },
        '/is-username-available': { window: 60, max: 20 },
        '/two-factor/verify-totp': { window: 300, max: 6 },
        '/two-factor/verify-backup-code': { window: 300, max: 5 },
        '/two-factor/enable': { window: 600, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-nf-client-connection-ip', 'x-forwarded-for'] },
      useSecureCookies: siteOrigin().startsWith('https://'),
      cookiePrefix: 'lek',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: siteOrigin().startsWith('https://'), path: '/' },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
        usernameValidator: (u) => validUsername(u.toLowerCase()),
      }),
      // Two-step verification (TOTP + backup codes). Required for every staff power (enforced server-side).
      twoFactor({ issuer: 'LËK Community' }),
      // Turnstile on sign-in, password reset and verification resends. Registration is verified by /api/community/register itself
      // (it calls sign-up server-side, so sign-up is deliberately not listed here).
      ...(turnstile ? [captcha({ provider: 'cloudflare-turnstile', secretKey: turnstile, endpoints: ['/sign-in/email', '/request-password-reset', '/send-verification-email'] })] : []),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof build>;
let instance: Auth | undefined;
export function getAuth(): Auth {
  if (!instance) instance = build();
  return instance;
}
