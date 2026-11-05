import { route } from '@/lib/community/route';
import { acceptInvite, requireViewer } from '@/lib/community/service';
import { ipKey, rateLimit } from '@/lib/community/security';

export const POST = route(
  async (req, _c, body) => {
    await rateLimit(`inviteaccept:${ipKey(req)}`, 10, 3600);
    return acceptInvite(await requireViewer(req.headers), String(body.token ?? ''));
  },
  { mutation: true },
);
