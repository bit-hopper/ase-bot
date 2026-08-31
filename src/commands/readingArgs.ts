import type { ZodiacSign } from "../data/types.js";
import { fuzzyMatchSign } from "../profile/signAliases.js";

export interface ReadingArgOverrides {
  sun?: ZodiacSign;
  moon?: ZodiacSign;
  rising?: ZodiacSign;
}

const FIELD_KEYWORDS = ["sun", "moon", "rising", "ascendant"] as const;
type FieldKeyword = (typeof FIELD_KEYWORDS)[number];

function isFieldKeyword(token: string): token is FieldKeyword {
  return (FIELD_KEYWORDS as readonly string[]).includes(token);
}

function normalizeField(field: FieldKeyword): "sun" | "moon" | "rising" {
  return field === "ascendant" ? "rising" : field;
}

export interface ParseReadingArgsResult {
  overrides: ReadingArgOverrides;
  errors: string[];
}

/**
 * Parses /reading's optional inline placement overrides (e.g. "sun libra moon pisces"),
 * each overriding the corresponding field from the stored /set profile for that single call
 * only. Same (field, sign) pair-walking grammar as /set's parseSetArgs, with two differences:
 * sign matching is typo-tolerant (see signAliases.fuzzyMatchSign) and "ascendant" aliases to
 * "rising". Empty input is valid — it just means "no overrides, use the stored profile as-is".
 * See spec §4.4.
 */
export function parseReadingArgs(argsText: string): ParseReadingArgsResult {
  const tokens = argsText.trim().split(/\s+/).filter(Boolean);
  const overrides: ReadingArgOverrides = {};
  const errors: string[] = [];

  for (let i = 0; i < tokens.length; i += 2) {
    const fieldRaw = tokens[i]!;
    const field = fieldRaw.toLowerCase();
    const signRaw = tokens[i + 1];

    if (!isFieldKeyword(field)) {
      errors.push(`Unknown field "${fieldRaw}". Expected one of: sun, moon, rising.`);
      continue;
    }
    if (!signRaw) {
      errors.push(`Missing sign value for "${field}".`);
      continue;
    }

    const sign = fuzzyMatchSign(signRaw);
    if (!sign) {
      errors.push(`Unrecognized sign "${signRaw}". Try a full sign name, e.g. libra.`);
      continue;
    }

    overrides[normalizeField(field)] = sign;
  }

  return { overrides, errors };
}
