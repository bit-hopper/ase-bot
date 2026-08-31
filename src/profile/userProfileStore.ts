import type pg from "pg";
import type { ZodiacSign } from "../data/types.js";

/** The `user_profiles.profile_source` column only ever stores one of these three (§3.4) —
 *  "cache" is purely a resolver-level label meaning "this came from the table", not a stored value. */
export type StoredProfileSource = "ase_record" | "bio" | "command";

export interface UserProfileRow {
  did: string;
  handle: string | null;
  displayName: string | null;
  bioRaw: string | null;
  bioHash: string | null;
  sun: ZodiacSign | null;
  moon: ZodiacSign | null;
  rising: ZodiacSign | null;
  profileSource: StoredProfileSource | null;
  lastReadingAt: Date | null;
  lastPullAt: Date | null;
  updatedAt: Date;
}

interface UserProfileDbRow {
  did: string;
  handle: string | null;
  display_name: string | null;
  bio_raw: string | null;
  bio_hash: string | null;
  sun: string | null;
  moon: string | null;
  rising: string | null;
  profile_source: string | null;
  last_reading_at: Date | null;
  last_pull_at: Date | null;
  updated_at: Date;
}

function fromDbRow(row: UserProfileDbRow): UserProfileRow {
  return {
    did: row.did,
    handle: row.handle,
    displayName: row.display_name,
    bioRaw: row.bio_raw,
    bioHash: row.bio_hash,
    sun: row.sun as ZodiacSign | null,
    moon: row.moon as ZodiacSign | null,
    rising: row.rising as ZodiacSign | null,
    profileSource: row.profile_source as StoredProfileSource | null,
    lastReadingAt: row.last_reading_at,
    lastPullAt: row.last_pull_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserProfile(pool: pg.Pool, did: string): Promise<UserProfileRow | null> {
  const result = await pool.query<UserProfileDbRow>("SELECT * FROM user_profiles WHERE did = $1", [did]);
  return result.rows[0] ? fromDbRow(result.rows[0]) : null;
}

// Explicit `| undefined` (rather than relying on Partial<>'s optional-key sugar) so that
// exactOptionalPropertyTypes allows callers to pass `sun: someOptionalValue` directly —
// undefined means "leave this field untouched" (see `pick` below).
export interface UserProfileUpdate {
  handle?: string | null | undefined;
  displayName?: string | null | undefined;
  bioRaw?: string | null | undefined;
  bioHash?: string | null | undefined;
  sun?: ZodiacSign | null | undefined;
  moon?: ZodiacSign | null | undefined;
  rising?: ZodiacSign | null | undefined;
  profileSource?: StoredProfileSource | null | undefined;
  lastReadingAt?: Date | null | undefined;
  lastPullAt?: Date | null | undefined;
}

/** A field absent from `update` (i.e. `undefined`) keeps its existing stored value — this is
 *  what makes /set's partial-set semantics (§3.3: "A user may set only their Sun") work: only
 *  the fields explicitly present in an update actually change. */
function pick<T>(newValue: T | undefined, existingValue: T | null | undefined): T | null {
  return newValue !== undefined ? newValue : (existingValue ?? null);
}

export async function upsertUserProfile(pool: pg.Pool, did: string, update: UserProfileUpdate): Promise<UserProfileRow> {
  const existing = await getUserProfile(pool, did);

  const merged = {
    handle: pick(update.handle, existing?.handle),
    displayName: pick(update.displayName, existing?.displayName),
    bioRaw: pick(update.bioRaw, existing?.bioRaw),
    bioHash: pick(update.bioHash, existing?.bioHash),
    sun: pick(update.sun, existing?.sun),
    moon: pick(update.moon, existing?.moon),
    rising: pick(update.rising, existing?.rising),
    profileSource: pick(update.profileSource, existing?.profileSource),
    lastReadingAt: pick(update.lastReadingAt, existing?.lastReadingAt),
    lastPullAt: pick(update.lastPullAt, existing?.lastPullAt),
  };

  const result = await pool.query<UserProfileDbRow>(
    `INSERT INTO user_profiles (did, handle, display_name, bio_raw, bio_hash, sun, moon, rising, profile_source, last_reading_at, last_pull_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (did) DO UPDATE SET
       handle = $2, display_name = $3, bio_raw = $4, bio_hash = $5,
       sun = $6, moon = $7, rising = $8, profile_source = $9,
       last_reading_at = $10, last_pull_at = $11, updated_at = NOW()
     RETURNING *`,
    [
      did,
      merged.handle,
      merged.displayName,
      merged.bioRaw,
      merged.bioHash,
      merged.sun,
      merged.moon,
      merged.rising,
      merged.profileSource,
      merged.lastReadingAt,
      merged.lastPullAt,
    ],
  );

  return fromDbRow(result.rows[0]!);
}
