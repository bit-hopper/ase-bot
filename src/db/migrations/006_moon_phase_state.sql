-- Singleton table tracking the last-known moon phase, diffed on every phenomena-check tick to
-- detect transitions into one of the 4 principal phases (New/First Quarter/Full/Last Quarter).
-- Separate from phenomena_state because phase is a joint Sun+Moon property, not a single
-- planet's own state — the `id` boolean-with-CHECK trick guarantees at most one row ever exists.
CREATE TABLE moon_phase_state (
  id          BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  phase       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
