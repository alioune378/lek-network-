import { route } from '@/lib/community/route';
import { myPilotFeedback, requireViewer, savePilotFeedback } from '@/lib/community/service';

export const GET = route(async (req) => ({ response: await myPilotFeedback(await requireViewer(req.headers)) }));
export const POST = route(async (req, _c, body) => savePilotFeedback(await requireViewer(req.headers), body), { mutation: true });
