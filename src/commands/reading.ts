import { formatBigThreeReading } from "../output/formatBigThreeReading.js";
import type { ReplyThread } from "../output/replyThread.js";
import { resolveProfile } from "../profile/profileResolver.js";
import { selectBigThree } from "../reading/bigThreeSelection.js";
import { renderBigThree } from "../templates/renderBigThree.js";
import type { NatalPlacements } from "../tarot/natal.js";
import type { CommandContext } from "./context.js";
import { fetchTransitSnapshots } from "./positions.js";
import { parseReadingArgs } from "./readingArgs.js";

const NO_PROFILE_REPLY = "Sorry. I don't have your placements yet. Try: /set sun [your sun sign], or /reading sun [sign] for a one-time reading.";

/**
 * /reading: Sun = theme, Moon = mood, ruling planet (from Rising, falling back to Sun) = ground
 * (spec §6.7-6.9).
 *
 * Accepts optional inline placement overrides ("/reading sun libra moon pisces"), each merged
 * over the stored /set profile for that single call only — nothing persists.
 */
export async function handleReading(ctx: CommandContext, args: string): Promise<ReplyThread> {
  const { overrides, errors } = parseReadingArgs(args);
  if (errors.length > 0) {
    return [`Couldn't read that: ${errors[0]} Try: /reading sun libra moon pisces`];
  }

  const placements = await resolveProfile(ctx.pool, ctx.did, ctx.resolverDeps);
  const natal: NatalPlacements = {
    sun: overrides.sun ?? placements.sun.value,
    moon: overrides.moon ?? placements.moon.value,
    rising: overrides.rising ?? placements.rising.value,
  };

  if (!natal.sun && !natal.moon && !natal.rising) {
    return [NO_PROFILE_REPLY];
  }

  const positions = await fetchTransitSnapshots(ctx.pool, { ttlHours: ctx.ephemerisTtlHours, now: ctx.now, calcFlags: ctx.calcFlags });

  const selection = selectBigThree(positions, natal);
  const rendered = renderBigThree(selection, natal);

  return formatBigThreeReading(natal, rendered);
}
