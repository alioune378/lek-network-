import { route } from '@/lib/community/route';
import { requireViewer, setStaff } from '@/lib/community/service';

export const POST = route(async (req, _c, body) => setStaff(await requireViewer(req.headers), body), { mutation: true });
