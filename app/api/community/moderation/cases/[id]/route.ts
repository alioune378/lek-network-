import { route } from '@/lib/community/route';
import { decideCase, requireViewer } from '@/lib/community/service';

export const POST = route(async (req, ctx, body) => decideCase(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
