-- Seed: insert the default points config singleton.
-- Run once after schema.sql.

INSERT INTO league_ranking_points_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
