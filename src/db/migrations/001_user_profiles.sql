-- §3.4
CREATE TABLE user_profiles (
  did             TEXT PRIMARY KEY,
  handle          TEXT,
  display_name    TEXT,
  bio_raw         TEXT,
  bio_hash        TEXT,           -- SHA-256 of bio; used to detect changes
  sun             TEXT,           -- canonical lowercase sign name or NULL
  moon            TEXT,
  rising          TEXT,
  profile_source  TEXT,           -- 'ase_record' | 'bio' | 'command'
  last_reading_at TIMESTAMPTZ,
  last_pull_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
