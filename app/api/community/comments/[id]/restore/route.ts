import { route } from '@/lib/community/route';
import { requireViewer, restoreComment } from '@/lib/community/service';

export const POST = route(async (req, ctx, body) => restoreComment(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
