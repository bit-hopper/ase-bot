import { randomFloat } from "../random/csprng.js";

/** §2 round 4: 5 posts/day, confined to a 6am-9pm PST active window, ~every 3h — supersedes round
 *  2's unconstrained "2-6h random delay, ~6/day avg, 8/24h cap." */
const TIMEZONE = "America/Los_Angeles";
const WINDOW_START_HOUR = 6;
const WINDOW_END_HOUR = 21;
const AVG_SPACING_HOURS = 3;
/** Uniform +/- jitter around the average spacing, so posts don't land on the exact clock hour
 *  every time. Keeps daily post count self-bounded to roughly 4-6 without a separate hard cap:
 *  the 15h window divided by a 2.5-3.5h step naturally lands between 15/3.5≈4.3 and 15/2.5=6. */
const JITTER_HOURS = 0.5;

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
 *  Safe with a single pass here because the only callers (6am/9pm) never land in the 1-3am window
 *  where a DST transition could make the offset itself ambiguous on the transition day. */
function zonedWallTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0));
  const offsetMs = zoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function windowStartUtc(referenceDate: Date): Date {
  const { year, month, day } = pstDateParts(referenceDate);
  return zonedWallTimeToUtc(year, month, day, WINDOW_START_HOUR, TIMEZONE);
}

/**
 * Computes the delay in ms until the next whimsy post should fire, given the current time.
 * Targets ~3h average spacing within the 6am-9pm PST window (round 4). If `now` is before today's
 * window opens, the next post is scheduled for today's window start. If the next ~3h-spaced
 * candidate would land at or past 9pm (or `now` itself is already past 9pm), rolls forward to
 * tomorrow's window start instead — so a given day gets roughly 5 posts (6, 9, 12, 15, 18 PST),
 * not a 6th one landing right at the window's edge.
 */
export function nextWhimsyDelayMs(now: Date): number {
  const nowPstHour = pstHourOfDay(now);

  if (nowPstHour < WINDOW_START_HOUR || nowPstHour >= WINDOW_END_HOUR) {
    const target = nowPstHour < WINDOW_START_HOUR ? windowStartUtc(now) : windowStartUtc(addDays(now, 1));
    return target.getTime() - now.getTime();
  }

  const jitter = (randomFloat() * 2 - 1) * JITTER_HOURS; // uniform in [-0.5, +0.5]
  const candidateHour = nowPstHour + AVG_SPACING_HOURS + jitter;

  if (candidateHour >= WINDOW_END_HOUR) {
    return windowStartUtc(addDays(now, 1)).getTime() - now.getTime();
  }

  return (candidateHour - nowPstHour) * 60 * 60 * 1000;
}
