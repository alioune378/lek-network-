'use client';

import { useCallback, useEffect, useState } from 'react';
import { MODE, api, type Viewer } from './client';

/** The signed-in member (or null). Not called at all while the community is switched off. */
export function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [ready, setReady] = useState(MODE === 'off');
  const refresh = useCallback(async () => {
    if (MODE === 'off') return;
    const r = await api<{ viewer: Viewer | null }>('/api/community/me');
    setViewer(r.ok ? r.data.viewer : null);
    setReady(true);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { viewer, ready, refresh };
}
