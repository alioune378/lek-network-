import { route } from '@/lib/community/route';
import { publicProfile } from '@/lib/community/service';

export const GET = route(async (_req, ctx) => publicProfile((await ctx.params).username));
