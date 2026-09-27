import { randomFloat } from "../random/csprng.js";

/** §2 round 5: hard-capped at exactly 6 posts/day (half the zodiac), confined to a 6am-6pm PST
 *  window — supersedes round 4's self-bounding "~5 posts/day, 6am-9pm, ~3h spacing," which only
 *  ever approximated its target count. */
const TIMEZONE = "America/Los_Angeles";
const WINDOW_START_HOUR = 6;
const WINDOW_END_HOUR = 18;
const POSTS_PER_DAY = 6;
/** Uniform +/- jitter around the day's ideal spacing, so posts don't land on the exact clock hour
 *  every time. */
const JITTER_HOURS = 0.5;
/** Floor on the computed spacing, purely to guarantee a positive delay -- not a pacing target. */
const MIN_SPACING_HOURS = 1 / 60;

function pstDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Current PST wall-clock time as a decimal hour (e.g. 14.5 = 2:30pm). */
function pstHourOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)!.value);
  const hour = get("hour");
  return (hour === 24 ? 0 : hour) + get("minute") / 60;
}

/** `timeZone`'s UTC offset (in ms; negative west of UTC, so PST is -8h) at the instant `utcDate`.
 *  Formats `utcDate` into the zone's wall-clock numbers, then re-reads those same numbers as if
 *  they were UTC — the difference is the offset. Only ever calls formatToParts (UTC -> zoned,
 *  which Intl does reliably and deterministically); never round-trips through `new Date(string)`,
 *  whose parsing depends on the host's own local timezone rather than a fixed rule. */
function zoneOffsetMs(utcDate: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const get = (type: string): string => parts.find((p) => p.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  const wallClockAsUtc = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), Number(hour), Number(get("minute")), Number(get("second")));
  return wallClockAsUtc - utcDate.getTime();
}

/** Converts a wall-clock (year, month, day, hour) in `timeZone` to the equivalent UTC Date. Node's
 *  Intl API only converts UTC -> zoned wall time, not the reverse, so this guesses UTC == the
 *  target wall-clock numbers, measures the zone's actual offset at that guess, and corrects once.
 *  Safe with a single pass here because the only callers (6am/6pm) never land in the 1-3am window
 *  where a DST transition could make the offset itself ambiguous on the transition day. */
function zonedWallTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0));
  const offsetMs = zoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** The UTC instant of `referenceDate`'s own PST calendar day's window open (6am PST). Also used by
 *  processWhimsyPost.ts as the cutoff for counting how many whimsy posts have gone out "today". */
export function windowStartUtc(referenceDate: Date): Date {
  const { year, month, day } = pstDateParts(referenceDate);
  return zonedWallTimeToUtc(year, month, day, WINDOW_START_HOUR, TIMEZONE);
}

/**
 * Computes the delay in ms until the next whimsy post should fire, given the current time and how
 * many whimsy posts have already gone out since today's window opened (round 5: a hard cap, not a
 * self-bounding approximation).
 *
 * - If the cap is already met, or `now` is at/past 6pm PST, waits for tomorrow's 6am PST window.
 * - If `now` is before 6am PST, waits for today's 6am PST window.
 * - Otherwise, spaces the remaining posts evenly across the remaining window time (so a delayed
 *   tick compresses the remaining spacing rather than dropping a post or overrunning past 6pm),
 *   with jitter layered on top so posts don't land on the exact clock hour every time.
 */
export function nextWhimsyDelayMs(now: Date, postsToday: number): number {
  const nowPstHour = pstHourOfDay(now);
  const capReached = postsToday >= POSTS_PER_DAY;
  const beforeWindow = nowPstHour < WINDOW_START_HOUR;
  const afterWindow = nowPstHour >= WINDOW_END_HOUR;

  if (capReached || afterWindow) {
    return windowStartUtc(addDays(now, 1)).getTime() - now.getTime();
  }
  if (beforeWindow) {
    return windowStartUtc(now).getTime() - now.getTime();
  }

  const remainingSlots = POSTS_PER_DAY - postsToday;
  const remainingWindowHours = WINDOW_END_HOUR - nowPstHour;
  const idealSpacingHours = remainingWindowHours / remainingSlots;
  const jitter = (randomFloat() * 2 - 1) * JITTER_HOURS; // uniform in [-0.5, +0.5]
  const spacingHours = Math.min(Math.max(idealSpacingHours + jitter, MIN_SPACING_HOURS), remainingWindowHours);

  return spacingHours * 60 * 60 * 1000;
}
