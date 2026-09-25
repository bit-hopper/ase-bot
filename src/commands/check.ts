import { formatCheck, formatCheckAll, formatCheckRetrograde } from "../output/formatCheck.js";
import type { ReplyThread } from "../output/replyThread.js";
import { parseCheckArgs } from "./checkArgs.js";
import type { CommandContext } from "./context.js";
import { fetchTransitSnapshots } from "./positions.js";

/** §4.1 — live sign, degree, and retrograde status for one of the 10 tracked planets, or all of
 *  them, or just the ones currently retrograde (§10.4b/§10.4c/§10.4d). */
export async function handleCheck(ctx: CommandContext, args: string): Promise<ReplyThread> {
  const parsed = parseCheckArgs(args);
  if ("error" in parsed) return [parsed.error];

  const positions = await fetchTransitSnapshots(ctx.pool, {
    ttlHours: ctx.ephemerisTtlHours,
    now: ctx.now,
    calcFlags: ctx.calcFlags,
  });

  switch (parsed.mode) {
    case "single":
      return formatCheck(parsed.planet, positions[parsed.planet]);
    case "all":
      return formatCheckAll(positions);
    case "retrograde":
      return formatCheckRetrograde(positions);
  }
}
