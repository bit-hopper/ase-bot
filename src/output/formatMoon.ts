import { MOON_PHASE_INTERPRETATION } from "../data/moonPhaseInterpretations.js";
import type { MoonPhase, ZodiacSign } from "../data/types.js";
import type { ReplyThread } from "./replyThread.js";
import { moonPhaseLabel, titleCase } from "./textUtils.js";

/** §10.5. `exactCountdown` — e.g. "exact today" / "exact in 1d 11h" / "exact 4h ago" — is only
 *  passed for the 4 notable phases (new/first quarter/full/last quarter); see commands/moon.ts. */
export function formatMoon(moonSign: ZodiacSign, moonPhase: MoonPhase, exactCountdown?: string | null): ReplyThread {
  const label = exactCountdown ? `${moonPhaseLabel(moonPhase)} (${exactCountdown})` : moonPhaseLabel(moonPhase);
  return [`🌙 Moon in ${titleCase(moonSign)} · ${label}\n\n${MOON_PHASE_INTERPRETATION[moonPhase]}`];
}
