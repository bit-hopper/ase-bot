import { formatCheck } from "../output/formatCheck.js";
import type { ReplyThread } from "../output/replyThread.js";
import { parseCheckArgs } from "./checkArgs.js";
import type { CommandContext } from "./context.js";
import { fetchTransitSnapshots } from "./positions.js";

/** §4.1 — live sign, degree, and retrograde status for one of the 10 tracked planets. */
export async function handleCheck(ctx: CommandContext, args: string): Promise<ReplyThread> {
  const parsed = parseCheckArgs(args);
  if ("error" in parsed) return [parsed.error];

  const positions = await fetchTransitSnapshots(ctx.pool, {
    ttlHours: ctx.ephemerisTtlHours,
    now: ctx.now,
    calcFlags: ctx.calcFlags,
  });

  return formatCheck(parsed.planet, positions[parsed.planet]);
}
