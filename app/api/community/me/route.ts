import { route } from '@/lib/community/route';
import { deleteAccount, getViewer, myAccount, requireViewer, updateProfile } from '@/lib/community/service';

export const GET = route(async (req) => {
  const v = await getViewer(req.headers);
  if (!v || v.deleted) return { viewer: null };
  return myAccount(v);
});
export const PATCH = route(async (req, _c, body) => updateProfile(await requireViewer(req.headers), body), { mutation: true });
export const DELETE = route(async (req, _c, body) => deleteAccount(await requireViewer(req.headers), req.headers, body), { mutation: true });
