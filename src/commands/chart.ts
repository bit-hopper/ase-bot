import { formatChart } from "../output/formatChart.js";
import type { ReplyThread } from "../output/replyThread.js";
import { resolveProfile } from "../profile/profileResolver.js";
import type { CommandContext } from "./context.js";

/** §4.1/§10.4 */
export async function handleChart(ctx: CommandContext): Promise<ReplyThread> {
  const placements = await resolveProfile(ctx.pool, ctx.did, ctx.resolverDeps);
  return formatChart({ sun: placements.sun.value, moon: placements.moon.value, rising: placements.rising.value });
}
