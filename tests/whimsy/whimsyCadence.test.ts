import { describe, expect, it } from "vitest";
import { nextWhimsyDelayMs, windowStartUtc } from "../../src/whimsy/whimsyCadence.js";

/** Reads back the PST/PDT wall-clock hour of a UTC instant, for asserting where a computed delay lands. */
function pstHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(
    date,
  );
  const get = (type: string): number => Number(parts.find((p) => p.type === type)!.value);
  const hour = get("hour");
  return (hour === 24 ? 0 : hour) + get("minute") / 60;
}

function pstDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(date);
}

describe("nextWhimsyDelayMs (hard cap: exactly 6/day, 6am-6pm PST)", () => {
  it("before the window: schedules for today's 6am PST, not a spacing offset from now", () => {
    // 2026-02-10 is PST (standard time, UTC-8): 2am PST = 10:00 UTC.
    const now = new Date("2026-02-10T10:00:00Z");
    const delay = nextWhimsyDelayMs(now, 0);
    const fireTime = new Date(now.getTime() + delay);

    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
  });

  it("mid-window, on schedule: lands ~2h later (within jitter), same PST calendar day", () => {
    // 10am PST on a standard-time date = 18:00 UTC. 1 of 6 posts done -> 5 remain over the 8h left.
    const now = new Date("2026-02-10T18:00:00Z");
    const delay = nextWhimsyDelayMs(now, 1);
    const fireTime = new Date(now.getTime() + delay);
    const fireHour = pstHour(fireTime);

    // ideal spacing = (18 - 10) / 5 = 1.6h, +/- 0.5h jitter
    expect(fireHour).toBeGreaterThanOrEqual(11.0);
    expect(fireHour).toBeLessThanOrEqual(12.2);
  });

  it("cap already met: rolls forward to tomorrow's 6am PST even though still mid-window", () => {
    const now = new Date("2026-02-10T18:00:00Z"); // 10am PST
    const delay = nextWhimsyDelayMs(now, 6);
    const fireTime = new Date(now.getTime() + delay);

    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
    expect(pstDay(fireTime)).not.toBe(pstDay(now));
  });

  it("at/after 6pm PST: rolls forward to tomorrow's 6am PST regardless of today's count", () => {
    const now = new Date("2026-02-11T02:00:00Z"); // 6pm PST on 2026-02-10
    const delay = nextWhimsyDelayMs(now, 3); // under quota, but window's closed for the day
    const fireTime = new Date(now.getTime() + delay);

    expect(pstHour(fireTime)).toBeCloseTo(6, 1);
    const nowDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(now);
    expect(pstDay(fireTime)).not.toBe(nowDay);
  });

  it("a delayed tick compresses spacing to still fit the remaining quota before 6pm", () => {
    // 5:30pm PST, only 3 of 6 posted -> 3 remain over the last 0.5h.
    const now = new Date("2026-02-11T01:30:00Z"); // 5:30pm PST on 2026-02-10
    const delay = nextWhimsyDelayMs(now, 3);
    const fireTime = new Date(now.getTime() + delay);
    const fireHour = pstHour(fireTime);

    expect(fireHour).toBeGreaterThan(17.5);
    expect(fireHour).toBeLessThanOrEqual(18);
  });

  it("always produces a positive delay", () => {
    const samples: Array<[Date, number]> = [
      [new Date("2026-02-10T00:00:00Z"), 0],
      [new Date("2026-02-10T14:00:00Z"), 2],
      [new Date("2026-02-10T14:00:00Z"), 6],
      [new Date("2026-02-10T23:59:00Z"), 4],
      [new Date("2026-07-10T14:00:00Z"), 1], // PDT (daylight time)
    ];
    for (const [now, postsToday] of samples) {
      expect(nextWhimsyDelayMs(now, postsToday)).toBeGreaterThan(0);
    }
  });

  it("holds across a DST boundary (PDT, UTC-7) — mid-window on-schedule spacing still lands correctly", () => {
    // 10am PDT in July = 17:00 UTC (UTC-7, not the winter UTC-8).
    const now = new Date("2026-07-10T17:00:00Z");
    const delay = nextWhimsyDelayMs(now, 1);
    const fireTime = new Date(now.getTime() + delay);
    const fireHour = pstHour(fireTime);

    expect(fireHour).toBeGreaterThanOrEqual(11.0);
    expect(fireHour).toBeLessThanOrEqual(12.2);
  });

  it("windowStartUtc: resolves to 6am PST/PDT on the given date's PST calendar day", () => {
    const winter = windowStartUtc(new Date("2026-02-10T10:00:00Z"));
    expect(pstHour(winter)).toBeCloseTo(6, 1);
    expect(pstDay(winter)).toBe("10");

    const summer = windowStartUtc(new Date("2026-07-10T17:00:00Z"));
    expect(pstHour(summer)).toBeCloseTo(6, 1);
    expect(pstDay(summer)).toBe("10");
  });
});

describe("nextWhimsyDelayMs simulation: exactly 6 posts land per day, none after 6pm PST", () => {
  it("running the chain start-to-finish for one PST day produces exactly 6 posts, all within the window", () => {
    let now = new Date("2026-02-10T13:00:00Z"); // midnight PST, well before window open
    let postsToday = 0;
    const fireHours: number[] = [];

    for (let tick = 0; tick < 6; tick++) {
      const delay = nextWhimsyDelayMs(now, postsToday);
      now = new Date(now.getTime() + delay);
      fireHours.push(pstHour(now));
      postsToday += 1;
    }

    expect(fireHours).toHaveLength(6);
    for (const hour of fireHours) {
      expect(hour).toBeGreaterThanOrEqual(6);
      expect(hour).toBeLessThanOrEqual(18);
    }
    // strictly increasing -- no two posts fire at the same instant
    for (let i = 1; i < fireHours.length; i++) {
      expect(fireHours[i]!).toBeGreaterThan(fireHours[i - 1]!);
    }

    // the 7th delay (cap now met) rolls to the next PST calendar day
    const seventhDelay = nextWhimsyDelayMs(now, postsToday);
    const seventhFire = new Date(now.getTime() + seventhDelay);
    expect(pstDay(seventhFire)).not.toBe(pstDay(now));
    expect(pstHour(seventhFire)).toBeCloseTo(6, 1);
  });
});
