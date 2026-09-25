import { PLANET_GLYPH } from "../data/planets.js";
import { PLANET_MEANING, PLANET_RETROGRADE_NOTE } from "../data/planetInterpretations.js";
import { PLANETS, RETROGRADE_CAPABLE_PLANETS, type Planet } from "../data/types.js";
import type { TransitSnapshot } from "../tarot/readingSelection.js";
import { packBlocksIntoThread, type ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

/** §4.1/§10 — "{glyph} {Planet} · {degree}° {Sign}{℞ if retrograde}", then a blank line and a
 *  short blurb (retrograde note appended when applicable). Mirrors formatMoon's shape. Shared by
 *  single-planet /check (§10.4b), /check all (§10.4c), and /check retrograde (§10.4d) so every
 *  mode renders a planet identically. */
function buildPlanetBlock(planet: Planet, snapshot: TransitSnapshot): string {
  const degree = Math.floor(snapshot.degreeInSign);
  const retroMark = snapshot.isRetrograde ? " ℞" : "";
  const header = `${PLANET_GLYPH[planet]} ${titleCase(planet)} · ${degree}° ${titleCase(snapshot.sign)}${retroMark}`;

  const retroNote =
    snapshot.isRetrograde && planet !== "sun" && planet !== "moon"
      ? ` ${PLANET_RETROGRADE_NOTE[planet]}`
      : "";

  return `${header}\n\n${PLANET_MEANING[planet]}${retroNote}`;
}

export function formatCheck(planet: Planet, snapshot: TransitSnapshot): ReplyThread {
  return [buildPlanetBlock(planet, snapshot)];
}

/** §10.4c — one block per tracked planet, in §4.1's canonical PLANETS order, packed into as few
 *  posts as fit. */
export function formatCheckAll(positions: Record<Planet, TransitSnapshot>): ReplyThread {
  const blocks = PLANETS.map((planet) => buildPlanetBlock(planet, positions[planet]));
  return packBlocksIntoThread(blocks);
}

/** §10.4d — same block rendering, filtered to whichever of the 8 retrograde-capable planets are
 *  currently retrograde. Sun/Moon are excluded from the candidate set entirely (never just
 *  filtered on isRetrograde), since they never retrograde. */
export function formatCheckRetrograde(positions: Record<Planet, TransitSnapshot>): ReplyThread {
  const retroPlanets = RETROGRADE_CAPABLE_PLANETS.filter((planet) => positions[planet].isRetrograde);
  if (retroPlanets.length === 0) return ["All clear — nothing's retrograde right now."];

  const blocks = retroPlanets.map((planet) => buildPlanetBlock(planet, positions[planet]));
  return packBlocksIntoThread(blocks);
}
