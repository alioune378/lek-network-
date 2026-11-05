import { route } from '@/lib/community/route';
import { register } from '@/lib/community/service';
import { HttpError, ipKey, rateLimit, verifyTurnstile } from '@/lib/community/security';

export const POST = route(
  async (req, _ctx, body) => {
    // Honeypot: real people never fill this hidden field.
    if (body.website) throw new HttpError(422, 'invalid');
    await rateLimit(`register:${ipKey(req)}`, Number(process.env.COMMUNITY_REGISTER_LIMIT ?? 5), 3600);
    await verifyTurnstile(body.captcha, req);
    return register(body);
  },
  { mutation: true },
);
