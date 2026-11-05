import { route } from '@/lib/community/route';
import { bootstrapFounder } from '@/lib/community/service';
import { ipKey, rateLimit } from '@/lib/community/security';

/** One-time founder bootstrap. Strict rate limit; refuses once an owner exists; the link only goes to FOUNDER_EMAIL. */
export const POST = route(
  async (req, _c, body) => {
    await rateLimit(`bootstrap:${ipKey(req)}`, 5, 3600);
    return bootstrapFounder(body, String(body.locale ?? 'fr'));
  },
  { mutation: true },
);
