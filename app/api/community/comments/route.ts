import { route } from '@/lib/community/route';
import { createComment, getViewer, listComments, requireViewer } from '@/lib/community/service';

export const GET = route(async (req) => {
  const u = new URL(req.url).searchParams;
  const viewer = await getViewer(req.headers);
  return listComments(u.get('article') ?? '', u.get('sort') ?? 'newest', Number(u.get('page') ?? 0) || 0, viewer);
});
export const POST = route(async (req, _c, body) => createComment(await requireViewer(req.headers), body), { mutation: true });
