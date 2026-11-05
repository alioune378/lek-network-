import { route } from '@/lib/community/route';
import { createInvites, listInvites, requireViewer } from '@/lib/community/service';

export const GET = route(async (req) => ({ items: await listInvites(await requireViewer(req.headers)) }));
export const POST = route(async (req, _c, body) => createInvites(await requireViewer(req.headers), body, String(body.locale ?? 'fr')), { mutation: true });
