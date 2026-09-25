import { PLANET_GLYPH } from "../data/planets.js";
import { PLANET_MEANING, PLANET_RETROGRADE_NOTE } from "../data/planetInterpretations.js";
import type { Planet } from "../data/types.js";
import type { TransitSnapshot } from "../tarot/readingSelection.js";
import type { ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

/** §4.1/§10 — "{glyph} {Planet} · {degree}° {Sign}{℞ if retrograde}", then a blank line and a
 *  short blurb (retrograde note appended when applicable). Mirrors formatMoon's shape. */
export function formatCheck(planet: Planet, snapshot: TransitSnapshot): ReplyThread {
  const degree = Math.floor(snapshot.degreeInSign);
  const retroMark = snapshot.isRetrograde ? " ℞" : "";
  const header = `${PLANET_GLYPH[planet]} ${titleCase(planet)} · ${degree}° ${titleCase(snapshot.sign)}${retroMark}`;

  const retroNote =
    snapshot.isRetrograde && planet !== "sun" && planet !== "moon"
      ? ` ${PLANET_RETROGRADE_NOTE[planet]}`
      : "";

  return [`${header}\n\n${PLANET_MEANING[planet]}${retroNote}`];
}
