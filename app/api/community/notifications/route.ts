import { route } from '@/lib/community/route';
import { markNotificationsRead, notifications, requireViewer } from '@/lib/community/service';

export const GET = route(async (req) => ({ items: await notifications(await requireViewer(req.headers)) }));
export const POST = route(async (req) => markNotificationsRead(await requireViewer(req.headers)), { mutation: true });
