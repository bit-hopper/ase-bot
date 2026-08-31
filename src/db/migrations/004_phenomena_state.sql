-- Last-known sign + retrograde status per tracked planet, diffed on every phenomena-check tick
-- to detect sign ingresses and retrograde stations. One row per planet in data/types.ts's
-- PLANETS (10 total) — Sun/Moon rows always carry is_retrograde = false.
CREATE TABLE phenomena_state (
  planet         TEXT PRIMARY KEY,
  sign           TEXT NOT NULL,
  is_retrograde  BOOLEAN NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
