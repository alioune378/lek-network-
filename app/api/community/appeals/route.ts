import { route } from '@/lib/community/route';
import { createAppeal, requireViewer } from '@/lib/community/service';

export const POST = route(async (req, _c, body) => createAppeal(await requireViewer(req.headers), body), { mutation: true });
