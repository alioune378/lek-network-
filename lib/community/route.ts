import { HttpError, assertSameOrigin, handle, json, readJson } from './security';
import { isEnabled, missingConfig } from './config';

type Ctx = { params: Promise<Record<string, string>> };
type Fn = (req: Request, ctx: Ctx, body: Record<string, unknown>) => Promise<unknown>;

/** Route wrapper: feature flag, same-origin + JSON for mutations, consistent errors, no caching. */
export function route(fn: Fn, opts: { mutation?: boolean } = {}) {
  return handle(async (req, ctx) => {
    if (!isEnabled()) throw new HttpError(503, 'community_disabled');
    const missing = missingConfig();
    if (missing.length) {
      // Details go to the server log only; the public gets a neutral answer.
      console.error('[community] configuration incomplete:', missing.join(', '));
      throw new HttpError(503, 'community_unavailable');
    }
    let body: Record<string, unknown> = {};
    if (opts.mutation) {
      assertSameOrigin(req);
      if (req.method !== 'DELETE' || req.headers.get('content-type')) body = await readJson(req);
    }
    return json(await fn(req, ctx, body));
  });
}
