import { route } from '@/lib/community/route';
import { requireViewer, revokeInvite } from '@/lib/community/service';

export const DELETE = route(async (req, ctx) => revokeInvite(await requireViewer(req.headers), (await ctx.params).id), { mutation: true });
