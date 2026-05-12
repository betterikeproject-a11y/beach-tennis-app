// Hand-written types matching supabase/schema.sql.
// Replace with generated types after running: npx supabase gen types typescript

export type TournamentStatus = "draft" | "grupos" | "eliminatorias" | "finalizado";
export type MatchStatus = "pendente" | "concluido";
export type KnockoutPhase = "quartas" | "semis" | "final" | "terceiro";

export interface Tournament {
  id: string;
  name: string;
  date: string;
  status: TournamentStatus;
  num_classificados_por_grupo: number;
  usar_cabecas_de_chave: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  name_normalized: string;
  is_cabeca_de_chave: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  tournament_id: string;
  group_number: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  player_id: string;
  position_override: number | null;
}

export interface GroupMatch {
  id: string;
  group_id: string;
  match_number: number;
  dupla1_player1_id: string;
  dupla1_player2_id: string;
  dupla2_player1_id: string;
  dupla2_player2_id: string;
  score_dupla1: number | null;
  score_dupla2: number | null;
  status: MatchStatus;
  updated_at: string;
}

export interface KnockoutPair {
  id: string;
  tournament_id: string;
  seed: number;
  player1_id: string;
  player2_id: string;
}

export interface KnockoutMatch {
  id: string;
  tournament_id: string;
  phase: KnockoutPhase;
  bracket_position: number;
  pair_a_id: string | null;
  pair_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_pair_id: string | null;
  updated_at: string;
}

export interface LeagueRankingPointsConfig {
  id: 1;
  pts_participacao: number;
  pts_por_vitoria_grupo: number;
  pts_quartas: number;
  pts_semis: number;
  pts_vice: number;
  pts_campeao: number;
  updated_at: string;
}

export interface TournamentPlayerPoints {
  id: string;
  tournament_id: string;
  player_name: string;
  player_display_name: string;
  vitorias_grupo: number;
  pts_participacao: number;
  pts_vitorias: number;
  pts_eliminatorias: number;
  total_pts: number;
  computed_at: string;
}

export interface LeagueRankingRow {
  player_name_normalized: string;
  player_display_name: string;
  total_participacoes: number;
  total_vitorias: number;
  total_pts_eliminatorias: number;
  total_pts: number;
}

// Minimal Database shape for createClient<Database>
export type Database = {
  public: {
    Tables: {
      tournaments: { Row: Tournament; Insert: Omit<Tournament, "id" | "created_at">; Update: Partial<Tournament> };
      players: { Row: Player; Insert: Omit<Player, "id" | "created_at">; Update: Partial<Player> };
      groups: { Row: Group; Insert: Omit<Group, "id">; Update: Partial<Group> };
      group_members: { Row: GroupMember; Insert: Omit<GroupMember, "id" | "position_override"> & { position_override?: number | null }; Update: Partial<GroupMember> };
      group_matches: { Row: GroupMatch; Insert: Omit<GroupMatch, "id" | "updated_at">; Update: Partial<GroupMatch> };
      knockout_pairs: { Row: KnockoutPair; Insert: Omit<KnockoutPair, "id">; Update: Partial<KnockoutPair> };
      knockout_matches: { Row: KnockoutMatch; Insert: Omit<KnockoutMatch, "id" | "updated_at">; Update: Partial<KnockoutMatch> };
      league_ranking_points_config: { Row: LeagueRankingPointsConfig; Insert: Partial<LeagueRankingPointsConfig>; Update: Partial<LeagueRankingPointsConfig> };
      tournament_player_points: { Row: TournamentPlayerPoints; Insert: Omit<TournamentPlayerPoints, "id" | "computed_at">; Update: Partial<TournamentPlayerPoints> };
    };
    Views: {
      league_ranking: { Row: LeagueRankingRow };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
