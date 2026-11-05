import { betterAuth } from 'better-auth';
import { username, captcha } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { getPool } from './db';
import { siteOrigin } from './config';
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
    trustedOrigins: [siteOrigin()],
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
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
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
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['x-nf-client-connection-ip', 'x-forwarded-for'] },
      useSecureCookies: siteOrigin().startsWith('https://'),
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
        usernameValidator: (u) => validUsername(u.toLowerCase()),
      }),
      ...(turnstile ? [captcha({ provider: 'cloudflare-turnstile', secretKey: turnstile })] : []),
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
