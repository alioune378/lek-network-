import { route } from '@/lib/community/route';
import { replyFeedback, requireViewer, updateFeedback } from '@/lib/community/service';

export const PATCH = route(async (req, ctx, body) => updateFeedback(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
export const POST = route(async (req, ctx, body) => replyFeedback(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
