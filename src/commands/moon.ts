import { dateToJulianDayUT } from "../astro/ephemeris.js";
import { computeMoonPhase, moonElongation, moonIllumination } from "../astro/moonPhase.js";
import { findNearestExactMoonPhase, NOTABLE_MOON_PHASES, type NotableMoonPhase } from "../astro/moonPhaseExact.js";
import type { MoonPhase } from "../data/types.js";
import { formatMoon } from "../output/formatMoon.js";
import type { ReplyThread } from "../output/replyThread.js";
import { fetchTransitSnapshots, toUtcDateString } from "./positions.js";
import type { CommandContext } from "./context.js";

const NOTABLE_PHASE_SET = new Set<MoonPhase>(NOTABLE_MOON_PHASES);

function isNotablePhase(phase: MoonPhase): phase is NotableMoonPhase {
  return NOTABLE_PHASE_SET.has(phase);
}

function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  return days > 0 ? `${days}d ${remHours}h` : `${remHours}h`;
}

/** Illumination % + countdown to a notable phase's exact instant, relative to `now` — e.g.
 *  "98%, 1d 10h to go", "94%, 1d 10h ago", or "100%, today" on the same UTC calendar date. */
function formatPhaseDetail(now: Date, phase: NotableMoonPhase, elongation: number, calcFlags: number | undefined): string {
  const { event, direction } = findNearestExactMoonPhase(dateToJulianDayUT(now), phase, calcFlags);
  const pct = Math.round(moonIllumination(elongation));

  if (toUtcDateString(event.date) === toUtcDateString(now)) return `${pct}%, today`;

  const hours = Math.abs(event.date.getTime() - now.getTime()) / (1000 * 60 * 60);
  const duration = formatDuration(hours);
  return direction === "upcoming" ? `${pct}%, ${duration} to go` : `${pct}%, ${duration} ago`;
}

/** §4.1/§10.5 */
export async function handleMoon(ctx: CommandContext): Promise<ReplyThread> {
  const positions = await fetchTransitSnapshots(ctx.pool, { ttlHours: ctx.ephemerisTtlHours, now: ctx.now, calcFlags: ctx.calcFlags });
  const moonPhase = computeMoonPhase(positions.sun.longitude, positions.moon.longitude);

  const exactCountdown = isNotablePhase(moonPhase)
    ? formatPhaseDetail(ctx.now, moonPhase, moonElongation(positions.sun.longitude, positions.moon.longitude), ctx.calcFlags)
    : null;

  return formatMoon(positions.moon.sign, moonPhase, exactCountdown);
}
