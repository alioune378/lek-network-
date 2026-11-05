import { route } from '@/lib/community/route';
import { usernameAvailable } from '@/lib/community/service';
import { ipKey, rateLimit } from '@/lib/community/security';

export const GET = route(async (req) => {
  await rateLimit(`username:${ipKey(req)}`, 30, 60);
  return usernameAvailable(new URL(req.url).searchParams.get('u') ?? '');
});
