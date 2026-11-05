import { route } from '@/lib/community/route';
import { deleteOwnComment, editComment, requireViewer } from '@/lib/community/service';

export const PATCH = route(async (req, ctx, body) => editComment(await requireViewer(req.headers), (await ctx.params).id, body), { mutation: true });
export const DELETE = route(async (req, ctx) => deleteOwnComment(await requireViewer(req.headers), (await ctx.params).id), { mutation: true });
