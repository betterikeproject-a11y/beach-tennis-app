-- Beach Tennis Tournament Manager — Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- RLS NOTE (MVP tradeoff): RLS is disabled on all tables.
-- Anyone with the Supabase anon key (embedded in the frontend) can read/write.
-- This is intentional — there is no auth, access is by URL.
-- Risk: if the anon key is ever leaked, data can be wiped. Acceptable for a
-- private club app. To harden later: enable RLS with a simple shared-secret
-- policy or move to authenticated access.

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid() on older PG


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE tournament_status AS ENUM ('draft', 'grupos', 'eliminatorias', 'finalizado');
CREATE TYPE match_status      AS ENUM ('pendente', 'concluido');
CREATE TYPE knockout_phase    AS ENUM ('quartas', 'semis', 'final', 'terceiro');


-- ============================================================
-- TOURNAMENTS
-- ============================================================

CREATE TABLE tournaments (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                         TEXT NOT NULL,
  date                         DATE NOT NULL,
  status                       tournament_status NOT NULL DEFAULT 'draft',
  num_classificados_por_grupo  INTEGER NOT NULL DEFAULT 3 CHECK (num_classificados_por_grupo >= 1),
  usar_cabecas_de_chave        BOOLEAN NOT NULL DEFAULT false,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- PLAYERS  (per-tournament, no master roster)
-- ============================================================

CREATE TABLE players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,             -- display name (as entered)
  name_normalized     TEXT NOT NULL,             -- lowercase + trimmed, used for league ranking matching
  is_cabeca_de_chave  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_players_name_normalized ON players(name_normalized);


-- ============================================================
-- GROUPS
-- ============================================================

CREATE TABLE groups (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_number  INTEGER NOT NULL CHECK (group_number >= 1),
  UNIQUE(tournament_id, group_number)
);

CREATE INDEX idx_groups_tournament ON groups(tournament_id);


-- ============================================================
-- GROUP MEMBERS
-- ============================================================

CREATE TABLE group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(group_id, player_id)
);

CREATE INDEX idx_group_members_group   ON group_members(group_id);
CREATE INDEX idx_group_members_player  ON group_members(player_id);


-- ============================================================
-- GROUP MATCHES
-- Scores are nullable until entered. Both must be set together.
-- Validation of score legality (6x0..7x6) is enforced in app logic,
-- not in DB — avoids fighting with partial input states during typing.
-- ============================================================

CREATE TABLE group_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  match_number        INTEGER NOT NULL CHECK (match_number >= 1),
  dupla1_player1_id   UUID NOT NULL REFERENCES players(id),
  dupla1_player2_id   UUID NOT NULL REFERENCES players(id),
  dupla2_player1_id   UUID NOT NULL REFERENCES players(id),
  dupla2_player2_id   UUID NOT NULL REFERENCES players(id),
  score_dupla1        INTEGER CHECK (score_dupla1 IS NULL OR (score_dupla1 >= 0 AND score_dupla1 <= 7)),
  score_dupla2        INTEGER CHECK (score_dupla2 IS NULL OR (score_dupla2 >= 0 AND score_dupla2 <= 7)),
  status              match_status NOT NULL DEFAULT 'pendente',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, match_number)
);

CREATE INDEX idx_group_matches_group ON group_matches(group_id);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_matches_updated_at
  BEFORE UPDATE ON group_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- KNOCKOUT PAIRS
-- Ordered by overall merit rank (seed=1 is best overall pair).
-- ============================================================

CREATE TABLE knockout_pairs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  seed          INTEGER NOT NULL CHECK (seed >= 1),
  player1_id    UUID    NOT NULL REFERENCES players(id),
  player2_id    UUID    NOT NULL REFERENCES players(id),
  UNIQUE(tournament_id, seed)
);

CREATE INDEX idx_knockout_pairs_tournament ON knockout_pairs(tournament_id);


-- ============================================================
-- KNOCKOUT MATCHES
-- pair_a_id / pair_b_id are nullable: later rounds are populated
-- only after prior rounds resolve.
-- winner_pair_id is set explicitly when scores are saved (not a
-- generated column, to allow manual correction).
-- ============================================================

CREATE TABLE knockout_matches (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID           NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase            knockout_phase NOT NULL,
  bracket_position INTEGER        NOT NULL CHECK (bracket_position >= 1),
  pair_a_id        UUID           REFERENCES knockout_pairs(id),
  pair_b_id        UUID           REFERENCES knockout_pairs(id),
  score_a          INTEGER        CHECK (score_a IS NULL OR (score_a >= 0 AND score_a <= 7)),
  score_b          INTEGER        CHECK (score_b IS NULL OR (score_b >= 0 AND score_b <= 7)),
  winner_pair_id   UUID           REFERENCES knockout_pairs(id),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, phase, bracket_position)
);

CREATE INDEX idx_knockout_matches_tournament ON knockout_matches(tournament_id);

CREATE TRIGGER trg_knockout_matches_updated_at
  BEFORE UPDATE ON knockout_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- LEAGUE RANKING POINTS CONFIG  (singleton — exactly one row)
-- Insert the default row in seed.sql.
-- ============================================================

CREATE TABLE league_ranking_points_config (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforces singleton
  pts_participacao      INTEGER NOT NULL DEFAULT 30,
  pts_por_vitoria_grupo INTEGER NOT NULL DEFAULT 20,
  pts_quartas           INTEGER NOT NULL DEFAULT 60,
  pts_semis             INTEGER NOT NULL DEFAULT 80,
  pts_vice              INTEGER NOT NULL DEFAULT 110,
  pts_campeao           INTEGER NOT NULL DEFAULT 140,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_config_updated_at
  BEFORE UPDATE ON league_ranking_points_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- TOURNAMENT PLAYER POINTS
-- One row per player per tournament. Written (or replaced) when
-- a tournament is finalized, or re-finalized after score edits.
-- player_name = normalized form (lowercase+trim) used as the
-- join key across tournaments.
-- player_display_name = most-recently-used casing, shown in UI.
-- ============================================================

CREATE TABLE tournament_player_points (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name          TEXT        NOT NULL,  -- normalized key
  player_display_name  TEXT        NOT NULL,  -- display casing
  vitorias_grupo       INTEGER     NOT NULL DEFAULT 0,
  pts_participacao     INTEGER     NOT NULL DEFAULT 0,
  pts_vitorias         INTEGER     NOT NULL DEFAULT 0,
  pts_eliminatorias    INTEGER     NOT NULL DEFAULT 0,
  total_pts            INTEGER     NOT NULL DEFAULT 0,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_name)
);

CREATE INDEX idx_tpp_tournament    ON tournament_player_points(tournament_id);
CREATE INDEX idx_tpp_player_name   ON tournament_player_points(player_name);


-- ============================================================
-- LEAGUE RANKING  (view — no materialization needed at MVP scale)
-- Aggregates all finalized tournament points by normalized name.
-- The UI can ORDER BY total_pts DESC client-side if preferred.
-- ============================================================

CREATE VIEW league_ranking AS
SELECT
  player_name                            AS player_name_normalized,
  -- Use the most recently computed display name for each normalized key
  (ARRAY_AGG(player_display_name ORDER BY computed_at DESC))[1]
                                         AS player_display_name,
  COUNT(DISTINCT tournament_id)          AS total_participacoes,
  SUM(vitorias_grupo)                    AS total_vitorias,
  SUM(pts_eliminatorias)                 AS total_pts_eliminatorias,
  SUM(total_pts)                         AS total_pts
FROM tournament_player_points
GROUP BY player_name;


-- ============================================================
-- SUPABASE REALTIME
-- Enable change-data-capture for the two tables that are edited
-- in real time during a live tournament.
-- If the publication doesn't exist yet, Supabase creates it on
-- project init — this ALTER is idempotent if already present.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE group_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE knockout_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
