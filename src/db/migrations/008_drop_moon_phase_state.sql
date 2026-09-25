-- Superseded by exact-instant forward search (astro/moonPhaseExact.ts) + phenomena_posted_log,
-- the same claim-based dedup eclipses already use. The old bucket-transition diff this table
-- backed announced the moment the sky drifted into a phase's 45deg band, not the exact instant.
DROP TABLE moon_phase_state;
