import type { BigThreeSelection } from "../reading/bigThreeSelection.js";
import { houseOrdinal } from "../reading/houseSystem.js";
import { moonConnector, sunConnector } from "../reading/readingConnectors.js";
import type { NatalPlacements } from "../tarot/natal.js";
import { titleCase } from "../output/textUtils.js";
import { interpolateSlots } from "./slots.js";

export interface RenderedGround {
  headerLine: string;
  text: string;
}

export interface RenderedBigThree {
  themeHeaderLine: string;
  themeText: string;
  moodHeaderLine: string;
  moodText: string;
  ground: RenderedGround | null;
  closing: string;
}

/** Turns a BigThreeSelection into rendered text for the new /reading (THEME/MOOD/GROUND) —
 *  interpolates the connector-library slots against the live signs and (where set) natal signs.
 *  See spec §9.6. */
export function renderBigThree(selection: BigThreeSelection, natal: NatalPlacements): RenderedBigThree {
  const slots: Record<string, string> = {
    currentSunSign: titleCase(selection.currentSunSign),
    currentMoonSign: titleCase(selection.currentMoonSign),
  };
  if (natal.sun) slots.natalSunSign = titleCase(natal.sun);
  if (natal.moon) slots.natalMoonSign = titleCase(natal.moon);

  const themeHeaderLine = `${selection.card.name} — ${titleCase(selection.currentSunSign)} season`;
  const themeText = interpolateSlots(`${selection.card.uprightMeaning}. ${sunConnector(selection.themeRelationship)}`, slots);

  const moodHeaderLine = `Moon in ${titleCase(selection.currentMoonSign)}`;
  const moodText = interpolateSlots(moonConnector(selection.moodRelationship), slots);

  const ground: RenderedGround | null = selection.ground
    ? {
        headerLine: `${titleCase(selection.ground.rulingPlanet)} in ${titleCase(selection.ground.rulingPlanetSign)} · ${houseOrdinal(selection.ground.house)} House — ${selection.ground.domain.name}`,
        text: selection.ground.domain.blurb,
      }
    : null;

  const closing = `What is ${selection.card.name} asking you to notice today?`;

  return { themeHeaderLine, themeText, moodHeaderLine, moodText, ground, closing };
}
