import { route } from '@/lib/community/route';
import { createFeedback, getViewer } from '@/lib/community/service';
import { HttpError, ipKey, rateLimit, verifyTurnstile } from '@/lib/community/security';

export const POST = route(
  async (req, _c, body) => {
    if (body.website) throw new HttpError(422, 'invalid');
    const viewer = await getViewer(req.headers);
    await rateLimit(`feedback:${viewer?.id ?? ipKey(req)}`, viewer ? 10 : 5, 3600);
    if (!viewer) await verifyTurnstile(body.captcha, req);
    return createFeedback(viewer && !viewer.deleted ? viewer : null, body);
  },
  { mutation: true },
);
