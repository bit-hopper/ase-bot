-- §13.2
CREATE TABLE reading_log (
  id            BIGSERIAL PRIMARY KEY,
  did           TEXT NOT NULL,
  command       TEXT NOT NULL,
  card          TEXT NOT NULL,
  orientation   TEXT NOT NULL,
  anchor_planet TEXT,
  anchor_degree NUMERIC,
  context_json  JSONB,          -- full AseContext for debugging
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX reading_log_did_created_at_idx ON reading_log (did, created_at DESC);
