import { route } from '@/lib/community/route';
import { actOnUser, requireViewer } from '@/lib/community/service';

export const POST = route(async (req, ctx, body) => actOnUser(await requireViewer(req.headers), (await ctx.params).username, body), { mutation: true });
