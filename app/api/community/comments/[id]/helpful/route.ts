import { route } from '@/lib/community/route';
import { requireViewer, toggleHelpful } from '@/lib/community/service';

export const POST = route(async (req, ctx) => toggleHelpful(await requireViewer(req.headers), (await ctx.params).id), { mutation: true });
