import { ZODIAC } from "../data/zodiac.js";
import type { RenderedBigThree } from "../templates/renderBigThree.js";
import type { NatalPlacements } from "../tarot/natal.js";
import { fitsInOnePost, joinSections, type ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

function natalLine(natal: NatalPlacements): string {
  const parts: string[] = [];
  if (natal.sun) parts.push(`${ZODIAC[natal.sun].glyph} ${titleCase(natal.sun)} Sun`);
  if (natal.moon) parts.push(`${ZODIAC[natal.moon].glyph} ${titleCase(natal.moon)} Moon`);
  if (natal.rising) parts.push(`${ZODIAC[natal.rising].glyph} ${titleCase(natal.rising)} Rising`);
  return parts.join("  ·  ");
}

/** §10.1b output for /reading (THEME/MOOD/GROUND) — single post if it fits,
 *  otherwise threaded by section. */
export function formatBigThreeReading(natal: NatalPlacements, rendered: RenderedBigThree): ReplyThread {
  const themeHeader = `THEME\n${rendered.themeHeaderLine}`;
  const moodHeader = `MOOD\n${rendered.moodHeaderLine}`;
  const groundHeader = rendered.ground ? `GROUND\n${rendered.ground.headerLine}` : "";
  const groundText = rendered.ground ? rendered.ground.text : "";

  const full = joinSections(natalLine(natal), themeHeader, rendered.themeText, moodHeader, rendered.moodText, groundHeader, groundText, rendered.closing);

  if (fitsInOnePost(full)) return [full];

  const thread: ReplyThread = [joinSections(natalLine(natal), themeHeader), rendered.themeText, joinSections(moodHeader, rendered.moodText)];
  if (rendered.ground) thread.push(joinSections(groundHeader, groundText));
  thread.push(rendered.closing);
  return thread;
}
