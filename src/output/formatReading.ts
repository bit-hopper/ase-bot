import type { Decan } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";
import type { AseContext } from "../reading/aseContext.js";
import type { RenderedReading } from "../templates/types.js";
import { fitsInOnePost, joinSections, type ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

function ordinalDecan(decan: Decan): string {
  return decan === 1 ? "1st" : decan === 2 ? "2nd" : "3rd";
}

/** §10.1's natal line uses full sign names (§10.4's /chart does too) — the one spec example
 *  ("Sag Rising") uses an abbreviation nowhere else defined for the other 11 signs, so full
 *  names are used consistently instead of inventing an ad hoc abbreviation scheme. */
function natalLine(ctx: AseContext): string {
  const parts: string[] = [];
  if (ctx.user.sun) parts.push(`${ZODIAC[ctx.user.sun].glyph} ${titleCase(ctx.user.sun)} Sun`);
  if (ctx.user.moon) parts.push(`${ZODIAC[ctx.user.moon].glyph} ${titleCase(ctx.user.moon)} Moon`);
  if (ctx.user.rising) parts.push(`${ZODIAC[ctx.user.rising].glyph} ${titleCase(ctx.user.rising)} Rising`);
  return parts.join("  ·  ");
}

function headerBlock(ctx: AseContext): string {
  const cardLine = `${ctx.tarot.card.name} · ${titleCase(ctx.tarot.orientation)}`;
  const anchorLine = `${titleCase(ctx.celestial.anchorPlanet)} in ${titleCase(ctx.celestial.anchorPlanetSign)} · ${ordinalDecan(ctx.celestial.anchorDecan)} Decan`;

  return `TODAY'S CARD\n${cardLine}\n${anchorLine}`;
}

/** §10.1 — one post if the whole reading fits, otherwise the documented 3-post thread:
 *  natal + header, then synthesis, then the closing line. */
export function formatReading(ctx: AseContext, rendered: RenderedReading): ReplyThread {
  const post1 = joinSections(natalLine(ctx), headerBlock(ctx));
  const full = joinSections(post1, rendered.synthesis, rendered.closing);

  if (fitsInOnePost(full)) return [full];

  const thread: ReplyThread = [post1, rendered.synthesis];
  if (rendered.closing.length > 0) thread.push(rendered.closing);
  return thread;
}
