/**
 * Detects a firehose connection that has gone silently stale — no events delivered at all
 * for `timeoutMs` — and calls `onStale()` so the caller can tear down and recreate the
 * `Firehose` instance. The raw, unfiltered network-wide firehose is extremely high-volume
 * (many events/sec even before any collection filtering), so total silence this long is an
 * unambiguous dead-connection signal, not a false positive under normal network conditions.
 *
 * This exists because a `FirehoseParseError`/`FirehoseHandlerError` on a single event is
 * already non-fatal by design in `@atproto/sync` (caught internally, logged via `onError`,
 * loop continues) — the failure mode this guards against is the underlying WebSocket going
 * stale without the library's own reconnect logic recovering it, which leaves the process
 * alive but the firehose's `for await` loop parked forever with nothing to detect it.
 */
export interface FirehoseWatchdog {
  /** Call on every event the firehose actually delivers, to reset the staleness clock. */
  markActivity: () => void;
  stop: () => void;
}

export interface FirehoseWatchdogOptions {
  /** How long without any activity before `onStale` fires. */
  timeoutMs: number;
  /** How often to check for staleness. */
  checkIntervalMs: number;
  onStale: () => void;
  /** Injectable clock for tests. */
  now?: () => number;
}

export function isStale(lastActivityAt: number, now: number, timeoutMs: number): boolean {
  return now - lastActivityAt >= timeoutMs;
}

export function startFirehoseWatchdog(options: FirehoseWatchdogOptions): FirehoseWatchdog {
  const now = options.now ?? Date.now;
  let lastActivityAt = now();

  const timer = setInterval(() => {
    if (isStale(lastActivityAt, now(), options.timeoutMs)) {
      options.onStale();
    }
  }, options.checkIntervalMs);
  timer.unref?.(); // a stuck watchdog timer alone shouldn't keep the process alive

  return {
    markActivity: () => {
      lastActivityAt = now();
    },
    stop: () => clearInterval(timer),
  };
}
