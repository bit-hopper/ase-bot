import type pg from "pg";
import { parseBio } from "./bioParser.js";
import { hashBio } from "./bioHash.js";
import { parseCanonicalSign } from "./signAliases.js";
import type { ParsedPlacements } from "./types.js";
import { getUserProfile, upsertUserProfile, type UserProfileRow } from "./userProfileStore.js";

export interface AseProfileRecord {
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
}

export interface BioLookup {
  bioRaw: string;
  handle?: string;
  displayName?: string;
}

export interface ProfileResolverDeps {
  /** §11.4 `app.ase.profile` PDS record fetch. AT Proto integration is M8 — omit until then. */
  fetchAseRecord?: (did: string) => Promise<AseProfileRecord | null>;
  /** Bluesky bio fetch (for both the freshness re-check and the first-time fallback parse). AT Proto integration is M8 — omit until then. */
  fetchBio?: (did: string) => Promise<BioLookup | null>;
}

function placementsFromRow(row: UserProfileRow): ParsedPlacements {
  return {
    sun: { value: row.sun, confidence: row.sun ? 1 : 0 },
    moon: { value: row.moon, confidence: row.moon ? 1 : 0 },
    rising: { value: row.rising, confidence: row.rising ? 1 : 0 },
    source: "cache",
  };
}

const EMPTY_PLACEMENTS: ParsedPlacements = {
  sun: { value: null, confidence: 0 },
  moon: { value: null, confidence: 0 },
  rising: { value: null, confidence: 0 },
  source: "bio",
};

/**
 * §3.1 — resolves a user's placements in priority order:
 *   1. app.ase.profile PDS record (highest authority)
 *   2. user_profiles cache — trusted as-is if it's /set-sourced (sticky, §3.3), or if
 *      bio-sourced and the bio hasn't changed since (§3.4 bio_hash diffing)
 *   3. bio parsing fallback (result is cached for next time)
 *   4. nothing found — caller is responsible for prompting /set (§3.1 point 4)
 */
export async function resolveProfile(pool: pg.Pool, did: string, deps: ProfileResolverDeps = {}): Promise<ParsedPlacements> {
  if (deps.fetchAseRecord) {
    const record = await deps.fetchAseRecord(did);
    if (record) {
      const sun = record.sunSign ? parseCanonicalSign(record.sunSign) : null;
      const moon = record.moonSign ? parseCanonicalSign(record.moonSign) : null;
      const rising = record.risingSign ? parseCanonicalSign(record.risingSign) : null;
      if (sun || moon || rising) {
        return {
          sun: { value: sun, confidence: sun ? 1 : 0 },
          moon: { value: moon, confidence: moon ? 1 : 0 },
          rising: { value: rising, confidence: rising ? 1 : 0 },
          source: "ase_record",
        };
      }
    }
  }

  const cached = await getUserProfile(pool, did);
  if (cached && (cached.sun || cached.moon || cached.rising)) {
    if (cached.profileSource === "command") {
      return placementsFromRow(cached); // explicit /set is sticky — never silently overridden by bio changes
    }

    if (cached.profileSource === "bio" && deps.fetchBio) {
      const bio = await deps.fetchBio(did);
      const freshHash = bio ? hashBio(bio.bioRaw) : null;
      if (freshHash && freshHash === cached.bioHash) {
        return placementsFromRow(cached); // bio unchanged since last parse — cache is still valid
      }
      // bio changed (or is now unreachable) — fall through and re-parse.
    } else {
      return placementsFromRow(cached);
    }
  }

  if (deps.fetchBio) {
    const bio = await deps.fetchBio(did);
    if (bio?.bioRaw) {
      const parsed = parseBio(bio.bioRaw);

      await upsertUserProfile(pool, did, {
        handle: bio.handle ?? null,
        displayName: bio.displayName ?? null,
        bioRaw: bio.bioRaw,
        bioHash: hashBio(bio.bioRaw),
        sun: parsed.sun.value,
        moon: parsed.moon.value,
        rising: parsed.rising.value,
        profileSource: "bio",
      });

      return parsed;
    }
  }

  return EMPTY_PLACEMENTS;
}
