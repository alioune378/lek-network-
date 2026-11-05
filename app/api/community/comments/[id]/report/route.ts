import { route } from '@/lib/community/route';
import { reportComment, requireViewer } from '@/lib/community/service';

export const POST = route(async (req, ctx, body) => reportComment(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
