import { SIGN_KEYWORDS } from "../data/signKeywords.js";
import type { ZodiacSign } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";
import type { ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

/** Fills the §10 gap for /sign (§4.1 defines the command; no output subsection exists). */
export function formatSign(sunSign: ZodiacSign | null): ReplyThread {
  if (!sunSign) {
    return ["You haven't set your Sun sign yet. Try: /set sun [your sun sign]"];
  }

  return [`${ZODIAC[sunSign].glyph} ${titleCase(sunSign)}\n\n${SIGN_KEYWORDS[sunSign]}`];
}
