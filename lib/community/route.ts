import { HttpError, assertSameOrigin, handle, json, readJson } from './security';
import { assertLiveReady, isEnabled } from './config';

type Ctx = { params: Promise<Record<string, string>> };
type Fn = (req: Request, ctx: Ctx, body: Record<string, unknown>) => Promise<unknown>;

/** Route wrapper: feature flag, same-origin + JSON for mutations, consistent errors, no caching. */
export function route(fn: Fn, opts: { mutation?: boolean } = {}) {
  return handle(async (req, ctx) => {
    if (!isEnabled()) throw new HttpError(503, 'community_disabled');
    assertLiveReady();
    let body: Record<string, unknown> = {};
    if (opts.mutation) {
      assertSameOrigin(req);
      if (req.method !== 'DELETE' || req.headers.get('content-type')) body = await readJson(req);
    }
    return json(await fn(req, ctx, body));
  });
}
