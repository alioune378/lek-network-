import { route } from '@/lib/community/route';
import { decideAppeal, requireViewer } from '@/lib/community/service';

export const POST = route(async (req, ctx, body) => decideAppeal(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
