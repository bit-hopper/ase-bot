import { computeMoonPhase } from "../astro/moonPhase.js";
import { formatMoon } from "../output/formatMoon.js";
import type { ReplyThread } from "../output/replyThread.js";
import { fetchTransitSnapshots } from "./positions.js";
import type { CommandContext } from "./context.js";

/** §4.1/§10.5 */
export async function handleMoon(ctx: CommandContext): Promise<ReplyThread> {
  const positions = await fetchTransitSnapshots(ctx.pool, { ttlHours: ctx.ephemerisTtlHours, now: ctx.now, calcFlags: ctx.calcFlags });
  const moonPhase = computeMoonPhase(positions.sun.longitude, positions.moon.longitude);
  return formatMoon(positions.moon.sign, moonPhase);
}
