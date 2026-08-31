import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStale, startFirehoseWatchdog } from "../../src/atproto/firehoseWatchdog.js";

describe("isStale (pure)", () => {
  it("is not stale before the timeout elapses", () => {
    expect(isStale(1000, 1000 + 4999, 5000)).toBe(false);
  });

  it("is stale exactly at the timeout boundary", () => {
    expect(isStale(1000, 1000 + 5000, 5000)).toBe(true);
  });

  it("is stale well past the timeout", () => {
    expect(isStale(1000, 1000 + 60_000, 5000)).toBe(true);
  });
});

describe("startFirehoseWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire onStale while activity keeps arriving within the timeout", () => {
    const onStale = vi.fn();
    const watchdog = startFirehoseWatchdog({ timeoutMs: 5000, checkIntervalMs: 1000, onStale });

    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(1000);
      watchdog.markActivity();
    }

    expect(onStale).not.toHaveBeenCalled();
    watchdog.stop();
  });

  it("fires onStale once activity stops arriving for longer than the timeout", () => {
    const onStale = vi.fn();
    const watchdog = startFirehoseWatchdog({ timeoutMs: 5000, checkIntervalMs: 1000, onStale });

    vi.advanceTimersByTime(4000);
    expect(onStale).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onStale).toHaveBeenCalled();

    watchdog.stop();
  });

  it("keeps firing onStale on every check while still stale (caller's job to act idempotently)", () => {
    const onStale = vi.fn();
    const watchdog = startFirehoseWatchdog({ timeoutMs: 5000, checkIntervalMs: 1000, onStale });

    vi.advanceTimersByTime(8000);
    expect(onStale.mock.calls.length).toBeGreaterThan(1);

    watchdog.stop();
  });

  it("stops checking once stopped", () => {
    const onStale = vi.fn();
    const watchdog = startFirehoseWatchdog({ timeoutMs: 5000, checkIntervalMs: 1000, onStale });

    watchdog.stop();
    vi.advanceTimersByTime(60_000);

    expect(onStale).not.toHaveBeenCalled();
  });
});
