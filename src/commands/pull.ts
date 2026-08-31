import { computeMoonPhase } from "../astro/moonPhase.js";
import { formatPull } from "../output/formatPull.js";
import type { ReplyThread } from "../output/replyThread.js";
import { drawPullCard } from "../tarot/pullDraw.js";
import { majorArcanaPullOrientation, minorArcanaPullOrientation } from "../tarot/pullOrientation.js";
import { renderPullOutput } from "../templates/renderPull.js";
import type { CommandContext } from "./context.js";
import { fetchTransitSnapshots } from "./positions.js";

/** §4.1/§6.4/§9.4/§10.2 */
export async function handlePull(ctx: CommandContext, args: string): Promise<ReplyThread> {
  if (args.trim().length > 0) {
    // §4.2 — spreads/counts ("/pull 3", "/pull love") are v2, not implemented yet.
    return ["/pull doesn't take any arguments yet — just: /pull"];
  }

  const card = drawPullCard();
  const positions = await fetchTransitSnapshots(ctx.pool, { ttlHours: ctx.ephemerisTtlHours, now: ctx.now, calcFlags: ctx.calcFlags });

  const orientation =
    card.type === "major"
      ? majorArcanaPullOrientation(computeMoonPhase(positions.sun.longitude, positions.moon.longitude))
      : minorArcanaPullOrientation(card.decanRuler ? positions[card.decanRuler] : null);

  const rendered = renderPullOutput(card, orientation.orientation);
  return formatPull(rendered);
}
