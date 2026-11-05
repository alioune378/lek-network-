import { route } from '@/lib/community/route';
import { checkInvite } from '@/lib/community/service';
import { ipKey, rateLimit } from '@/lib/community/security';

export const GET = route(async (req) => {
  await rateLimit(`invitecheck:${ipKey(req)}`, 30, 600);
  return checkInvite(new URL(req.url).searchParams.get('token') ?? '');
});
