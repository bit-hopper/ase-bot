import type { Redis } from "ioredis";

const CURSOR_KEY = "firehose:cursor";

/**
 * How stale a persisted cursor can be before it's discarded rather than replayed. Bounds
 * worst-case catch-up time: replaying the full unfiltered network firehose from an old cursor
 * is slow enough (strictly serial per-event processing, a Redis round-trip per event) that
 * after an outage longer than this, the replay itself can take comparable-or-longer wall-clock
 * time than the outage did — the bot comes back up but every new mention queues up behind a
 * backlog of unrelated network-wide traffic instead of being answered. Found live: after a
 * 3+ hour stall, the persisted cursor was still ~430K sequence numbers behind "now" tens of
 * minutes after restart, with new mentions sent during that window stuck waiting behind it.
 * Past this threshold, starting from "now" (accepting that mentions sent during the outage are
 * missed — the same tradeoff already accepted for the no-cursor case below) beats a
 * silent, possibly multi-hour catch-up that looks identical to "still broken" from outside.
 */
const MAX_CURSOR_AGE_MS = 10 * 60_000;

export interface CursorStore {
  get(): Promise<number | undefined>;
  set(seq: number): Promise<void>;
}

interface StoredCursor {
  seq: number;
  savedAt: number;
}

function isStoredCursor(value: unknown): value is StoredCursor {
  return typeof value === "object" && value !== null && typeof (value as StoredCursor).seq === "number" && typeof (value as StoredCursor).savedAt === "number";
}

/**
 * Persists the firehose's stream position across restarts/reconnects. Without this, the
 * Firehose client has no cursor and always starts from "now" with no replay — any mention
 * sent during startup or a reconnect gap is silently dropped forever, not delayed. Found live:
 * the first mention sent right at process startup (before the WebSocket subscription had
 * actually finished connecting) never arrived.
 *
 * Stores a `{seq, savedAt}` pair rather than a bare sequence number so staleness can be judged
 * against MAX_CURSOR_AGE_MS above. A pre-existing bare-number value (the old format) or any
 * other malformed value fails the `isStoredCursor` shape check and is treated as absent —
 * deploying this change alone makes the very next stale cursor discard itself.
 */
export function createCursorStore(redis: Redis, maxAgeMs: number = MAX_CURSOR_AGE_MS): CursorStore {
  return {
    async get(): Promise<number | undefined> {
      const raw = await redis.get(CURSOR_KEY);
      if (!raw) return undefined;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return undefined;
      }

      if (!isStoredCursor(parsed)) return undefined;
      if (Date.now() - parsed.savedAt > maxAgeMs) return undefined;
      return parsed.seq;
    },
    async set(seq: number): Promise<void> {
      const stored: StoredCursor = { seq, savedAt: Date.now() };
      await redis.set(CURSOR_KEY, JSON.stringify(stored));
    },
  };
}
