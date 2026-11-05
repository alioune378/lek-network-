/**
 * LËK Live configuration. The page never invents a broadcast:
 * "live" is shown only if NEXT_PUBLIC_LIVE_STATUS=live AND a real HLS URL is configured.
 */
export type LiveStatus = 'live' | 'scheduled' | 'replay' | 'offline';
export type ScheduleItem = { start: string; title: string; programme?: string };
export type Replay = { title: string; src: string; poster?: string; date: string };

const raw = (process.env.NEXT_PUBLIC_LIVE_STATUS || 'offline').toLowerCase();
const url = process.env.NEXT_PUBLIC_LIVE_HLS_URL || '';

export const LIVE = {
  status: (raw === 'live' && url ? 'live' : raw === 'scheduled' ? 'scheduled' : 'offline') as LiveStatus,
  src: url,
  title: process.env.NEXT_PUBLIC_LIVE_TITLE || '',
  /** Confirmed broadcasts only. Empty until real dates exist. */
  schedule: [] as ScheduleItem[],
  /** Recorded replays only. Empty until real recordings exist. */
  replays: [] as Replay[],
};
