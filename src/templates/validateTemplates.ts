import { pathToFileURL } from "node:url";
import { DECAN_MATRIX } from "../data/decans.js";
import { FULL_DECK } from "../data/deck.js";
import { CARD_ORIENTATIONS, RELATIONSHIP_TYPES } from "../data/types.js";
import { loadReadingTemplates } from "./loadTemplates.js";
import type { ReadingTemplate } from "./types.js";

export interface TemplateValidationResult {
  /** "card|orientation|relationshipType" — missing from the 432 required /divine combos.
   *  (Field name kept as "Reading" — this backs readings.json, which now powers /divine, the
   *  renamed original /reading engine.) */
  missingReadingCombos: string[];
  /** "card|orientation" — missing card.uprightMeaning/reversedMeaning, one of the 156 /pull slots. */
  missingPullMeanings: string[];
}

/** §17.3 — verifies every `card x orientation x relationship_type` combo (432, backing /divine)
 *  and every card x orientation meaning (156, /pull) is present. Any gaps are build errors. */
export function validateTemplates(templates: ReadingTemplate[] = loadReadingTemplates()): TemplateValidationResult {
  const present = new Set(templates.map((t) => `${t.card}|${t.orientation}|${t.relationshipType}`));

  const missingReadingCombos: string[] = [];
  for (const decan of DECAN_MATRIX) {
    for (const orientation of CARD_ORIENTATIONS) {
      for (const relationshipType of RELATIONSHIP_TYPES) {
        const key = `${decan.cardKey}|${orientation}|${relationshipType}`;
        if (!present.has(key)) missingReadingCombos.push(key);
      }
    }
  }

  const missingPullMeanings: string[] = [];
  for (const card of FULL_DECK) {
    for (const orientation of CARD_ORIENTATIONS) {
      const meaning = orientation === "upright" ? card.uprightMeaning : card.reversedMeaning;
      if (!meaning) missingPullMeanings.push(`${card.key}|${orientation}`);
    }
  }

  return { missingReadingCombos, missingPullMeanings };
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const result = validateTemplates();
  const totalMissing = result.missingReadingCombos.length + result.missingPullMeanings.length;

  if (totalMissing === 0) {
    console.log("Template library complete: all 432 /divine combos and 156 /pull meanings present.");
    process.exit(0);
  }

  console.error(
    `Template library incomplete: ${result.missingReadingCombos.length}/432 /divine combos missing, ${result.missingPullMeanings.length}/156 /pull meanings missing.`,
  );
  if (result.missingReadingCombos.length > 0) {
    console.error("\nMissing /divine combos (card|orientation|relationshipType):");
    for (const c of result.missingReadingCombos) console.error(`  ${c}`);
  }
  if (result.missingPullMeanings.length > 0) {
    console.error("\nMissing /pull meanings (card|orientation):");
    for (const c of result.missingPullMeanings) console.error(`  ${c}`);
  }
  process.exit(1);
}
