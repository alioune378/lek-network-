'use client';

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, usernameClient } from 'better-auth/client/plugins';

/** Build-time flag for the interface. The server enforces COMMUNITY_MODE independently. */
export const MODE = (process.env.NEXT_PUBLIC_COMMUNITY_MODE ?? 'off') as 'off' | 'demo' | 'pilot' | 'live';
/** Display only; the server enforces COMMUNITY_REGISTRATION. */
export const REGISTRATION = (process.env.NEXT_PUBLIC_COMMUNITY_REGISTRATION ?? 'closed') as 'closed' | 'invite' | 'open';
export const PILOT_END = process.env.NEXT_PUBLIC_PILOT_END_DATE ?? '';
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

// The sign-in form handles the two-step prompt itself (no automatic redirect).
export const authClient = createAuthClient({ plugins: [usernameClient(), twoFactorClient()] });

export type ApiResult<T = Record<string, unknown>> = { ok: boolean; status: number; data: T & { error?: string; fields?: Record<string, string> } };

export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const method = init.method ?? 'GET';
    // Mutations always send JSON (an empty object when there is no body), which the server requires.
    if (method !== 'GET' && init.body === undefined) init = { ...init, body: {} };
    const r = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } as T & { error: string } };
  }
}

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
  staff: { role: string; title: string } | null;
  restriction: { kind: 'comment_restricted' | 'suspended'; endsAt: string | null; reason: string } | null;
};

export const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
