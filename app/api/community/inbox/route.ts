import { route } from '@/lib/community/route';
import { inbox, requireViewer } from '@/lib/community/service';

export const GET = route(async (req) => inbox(await requireViewer(req.headers), new URL(req.url).searchParams.get('status') ?? ''));
