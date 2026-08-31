import { describe, expect, it } from "vitest";
import { nextWhimsyDelayMs } from "../../src/whimsy/whimsyCadence.js";

/** Reads back the PST/PDT wall-clock hour of a UTC instant, for asserting where a computed delay lands. */
function pstHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(
    date,
  );
  const get = (type: string): number => Number(parts.find((p) => p.type === type)!.value);
  const hour = get("hour");
  return (hour === 24 ? 0 : hour) + get("minute") / 60;
}

describe("nextWhimsyDelayMs (5/day, 6am-9pm PST, ~3h spacing)", () => {
  it("before the window: schedules for today's 6am PST, not a ~3h offset from now", () => {
    // 2026-02-10 is PST (standard time, UTC-8): 2am PST = 10:00 UTC.
    const now = new Date("2026-02-10T10:00:00Z");
    const delay = nextWhimsyDelayMs(now);
    const fireTime = new Date(now.getTime() + delay);

    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
  });

  it("mid-window: lands ~3h later (within jitter), same PST calendar day", () => {
    // 10am PST on a standard-time date = 18:00 UTC.
    const now = new Date("2026-02-10T18:00:00Z");
    const delay = nextWhimsyDelayMs(now);
    const fireTime = new Date(now.getTime() + delay);
    const fireHour = pstHour(fireTime);

    expect(fireHour).toBeGreaterThanOrEqual(12.4); // 10 + 3 - 0.5 - a hair of float slack
    expect(fireHour).toBeLessThanOrEqual(13.6); // 10 + 3 + 0.5 + a hair of float slack
  });

  it("near the window end: rolls forward to tomorrow's 6am PST instead of firing past 9pm", () => {
    // 7pm PST — a ~3h candidate would land at ~10pm, past the 9pm window end.
    const now = new Date("2026-02-11T03:00:00Z"); // 7pm PST on 2026-02-10
    const delay = nextWhimsyDelayMs(now);
    const fireTime = new Date(now.getTime() + delay);

    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
    // and it's the *next* calendar day in PST, not the same one
    const nowDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(now);
    const fireDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(fireTime);
    expect(fireDay).not.toBe(nowDay);
  });

  it("already past the window (e.g. a slow tick at 10pm): rolls forward to tomorrow's 6am PST", () => {
    const now = new Date("2026-02-11T06:00:00Z"); // 10pm PST on 2026-02-10
    const delay = nextWhimsyDelayMs(now);
    const fireTime = new Date(now.getTime() + delay);
    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
  });

  it("always produces a positive delay", () => {
    const samples = [
      new Date("2026-02-10T00:00:00Z"),
      new Date("2026-02-10T14:00:00Z"),
      new Date("2026-02-10T23:59:00Z"),
      new Date("2026-07-10T14:00:00Z"), // PDT (daylight time)
    ];
    for (const now of samples) {
      expect(nextWhimsyDelayMs(now)).toBeGreaterThan(0);
    }
  });

  it("holds across a DST boundary (PDT, UTC-7) — mid-window still lands ~3h later", () => {
    // 10am PDT in July = 17:00 UTC (UTC-7, not the winter UTC-8).
    const now = new Date("2026-07-10T17:00:00Z");
    const delay = nextWhimsyDelayMs(now);
    const fireTime = new Date(now.getTime() + delay);
    const fireHour = pstHour(fireTime);

    expect(fireHour).toBeGreaterThanOrEqual(12.4);
    expect(fireHour).toBeLessThanOrEqual(13.6);
  });
});
