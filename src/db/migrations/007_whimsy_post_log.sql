-- Repeat-avoidance log for whimsy posts. Uses the fragment text itself as the key rather than a
-- synthetic id, since Pool A/B (src/whimsy/whimsyFragments.ts) are plain string arrays with no
-- id column of their own.
CREATE TABLE whimsy_post_log (
  id         SERIAL PRIMARY KEY,
  sign       TEXT NOT NULL,
  directive  TEXT NOT NULL,
  punchline  TEXT,
  posted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repeat-avoidance queries always pull the N most recent rows.
CREATE INDEX whimsy_post_log_posted_at_idx ON whimsy_post_log (posted_at DESC);
