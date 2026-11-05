import { route } from '@/lib/community/route';
import { appealsQueue, auditLog, moderationQueue, requireViewer } from '@/lib/community/service';

export const GET = route(async (req) => {
  const v = await requireViewer(req.headers);
  const view = new URL(req.url).searchParams.get('view') ?? 'open';
  if (view === 'appeals') return { items: await appealsQueue(v) };
  if (view === 'audit') return { items: await auditLog(v) };
  return { items: await moderationQueue(v, view) };
});
