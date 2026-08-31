-- Records which eclipse events have already been posted, keyed by (event_type, event_date) at
-- day granularity. Stations/ingresses don't need this table — the phenomena_state diff itself is
-- their dedup mechanism — but eclipses are detected via a forward search that would otherwise
-- keep matching the same future eclipse on every tick until its lookahead window is hit.
CREATE TABLE phenomena_posted_log (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  event_date  DATE NOT NULL,
  posted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, event_date)
);
