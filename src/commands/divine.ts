import { formatReading } from "../output/formatReading.js";
import type { ReplyThread } from "../output/replyThread.js";
import { resolveProfile } from "../profile/profileResolver.js";
import { buildAseContext } from "../reading/aseContext.js";
import type { NatalPlacements } from "../tarot/natal.js";
import { selectReadingCard } from "../tarot/readingSelection.js";
import { renderReading } from "../templates/renderReading.js";
import type { CommandContext } from "./context.js";
import { fetchTransitSnapshots, toUtcDateString } from "./positions.js";

const NO_PROFILE_REPLY = "I don't have your placements yet. Try: /set sun [your sun sign]";

/**
 * §6.2/§7/§10.1 — /divine (formerly /reading; renamed when /reading was redesigned around the
 * "Sun = theme, Moon = mood, Rising = where it plays out" Big Three formula). Picks whichever
 * transiting planet is astrologically loudest right now via Impact Score / Anchor Transit, then
 * routes that planet's position to a decan card. Always live "now".
 */
export async function handleDivine(ctx: CommandContext): Promise<ReplyThread> {
  const placements = await resolveProfile(ctx.pool, ctx.did, ctx.resolverDeps);
  const natal: NatalPlacements = { sun: placements.sun.value, moon: placements.moon.value, rising: placements.rising.value };

  if (!natal.sun && !natal.moon && !natal.rising) {
    return [NO_PROFILE_REPLY];
  }

  const positions = await fetchTransitSnapshots(ctx.pool, { ttlHours: ctx.ephemerisTtlHours, now: ctx.now, calcFlags: ctx.calcFlags });

  const selection = selectReadingCard(positions, natal, { did: ctx.did, date: toUtcDateString(ctx.now) });
  const aseContext = buildAseContext({ did: ctx.did, handle: ctx.handle, natal, profileSource: placements.source, positions, selection });
  const rendered = renderReading(ctx.templates, aseContext);

  return formatReading(aseContext, rendered);
}
