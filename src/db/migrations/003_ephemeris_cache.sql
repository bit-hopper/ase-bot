-- §13.3
CREATE TABLE ephemeris_cache (
  id           SERIAL PRIMARY KEY,
  cached_at    TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  positions    JSONB NOT NULL    -- keyed by planet name; values are { sign, degree, isRetrograde }
);

-- Only the most recent non-expired row is used (§13.3).
CREATE INDEX ephemeris_cache_cached_at_idx ON ephemeris_cache (cached_at DESC);
