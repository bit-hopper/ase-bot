import type pg from "pg";
import type { ZodiacSign } from "../data/types.js";
import { parseCanonicalSign } from "./signAliases.js";
import { upsertUserProfile, type UserProfileRow } from "./userProfileStore.js";

export interface SetPlacements {
  sun?: ZodiacSign;
  moon?: ZodiacSign;
  rising?: ZodiacSign;
}

const FIELD_KEYWORDS = ["sun", "moon", "rising"] as const;
type FieldKeyword = (typeof FIELD_KEYWORDS)[number];

function isFieldKeyword(token: string): token is FieldKeyword {
  return (FIELD_KEYWORDS as readonly string[]).includes(token);
}

export interface ParseSetResult {
  placements: SetPlacements;
  errors: string[];
}

/**
 * §3.3 — parses /set's argument text (everything after "/set "). Grammar is a sequence of
 * (field, sign) pairs, e.g. "sun leo moon pisces rising sagittarius". Partial sets are valid
 * (§3.3: "A user may set only their Sun").
 */
export function parseSetArgs(argsText: string): ParseSetResult {
  const tokens = argsText.trim().split(/\s+/).filter(Boolean);
  const placements: SetPlacements = {};
  const errors: string[] = [];

  if (tokens.length === 0) {
    errors.push("I didn't catch any placements. Try: set sun [sign] moon [sign] rising [sign]");
    return { placements, errors };
  }

  for (let i = 0; i < tokens.length; i += 2) {
    const fieldRaw = tokens[i]!;
    const field = fieldRaw.toLowerCase();
    const signRaw = tokens[i + 1];

    if (!isFieldKeyword(field)) {
      errors.push(`"${fieldRaw}" isn't one of my placements. Try sun, moon, or rising.`);
      continue;
    }
    if (!signRaw) {
      errors.push(`I need a sign after "${field}".`);
      continue;
    }

    const sign = parseCanonicalSign(signRaw);
    if (!sign) {
      errors.push(`I don't know the sign "${signRaw}". Try one of the 12 zodiac signs.`);
      continue;
    }

    placements[field] = sign;
  }

  return { placements, errors };
}

export interface ApplySetResult {
  placements: SetPlacements;
  errors: string[];
  /** null if there were no valid placements to persist (e.g. every token was invalid). */
  stored: UserProfileRow | null;
}

export interface ApplySetOptions {
  /** §3.3 step 3 / §11.4 — best-effort PDS write; v1 explicitly falls back to DB-only if this isn't wired up yet (AT Proto integration is M8). */
  writeAseRecord?: ((did: string, placements: SetPlacements) => Promise<void>) | undefined;
}

/** §3.3 steps 1-3: validate, upsert `user_profiles` (merge — untouched fields are preserved), optionally write the PDS record. */
export async function applySetCommand(
  pool: pg.Pool,
  did: string,
  argsText: string,
  options: ApplySetOptions = {},
): Promise<ApplySetResult> {
  const { placements, errors } = parseSetArgs(argsText);

  if (Object.keys(placements).length === 0) {
    return { placements, errors, stored: null };
  }

  const stored = await upsertUserProfile(pool, did, {
    sun: placements.sun,
    moon: placements.moon,
    rising: placements.rising,
    profileSource: "command",
  });

  if (options.writeAseRecord) {
    await options.writeAseRecord(did, placements);
  }

  return { placements, errors, stored };
}
