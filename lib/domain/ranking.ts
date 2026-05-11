export type PointsConfig = {
  pts_participacao: number;
  pts_por_vitoria_grupo: number;
  pts_quartas: number;
  pts_semis: number;
  pts_vice: number;
  pts_campeao: number;
};

export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  pts_participacao: 30,
  pts_por_vitoria_grupo: 20,
  pts_quartas: 60,
  pts_semis: 80,
  pts_vice: 110,
  pts_campeao: 140,
};

export type KnockoutResult = "none" | "quartas" | "semis" | "vice" | "campeao";

export type TournamentPlayerResult = {
  playerId: string;
  playerDisplayName: string;
  victoriesInGroup: number;
  knockoutResult: KnockoutResult;
};

export type PlayerPointsRow = {
  player_name: string;        // normalized key
  player_display_name: string;
  vitorias_grupo: number;
  pts_participacao: number;
  pts_vitorias: number;
  pts_eliminatorias: number;
  total_pts: number;
};

export function computePlayerPoints(
  result: TournamentPlayerResult,
  config: PointsConfig
): PlayerPointsRow {
  const pts_vitorias = result.victoriesInGroup * config.pts_por_vitoria_grupo;

  const pts_eliminatorias = {
    none: 0,
    quartas: config.pts_quartas,
    semis: config.pts_semis,
    vice: config.pts_vice,
    campeao: config.pts_campeao,
  }[result.knockoutResult];

  return {
    player_name: normalizeName(result.playerDisplayName),
    player_display_name: result.playerDisplayName,
    vitorias_grupo: result.victoriesInGroup,
    pts_participacao: config.pts_participacao,
    pts_vitorias,
    pts_eliminatorias,
    total_pts: config.pts_participacao + pts_vitorias + pts_eliminatorias,
  };
}

/** Lowercase + trim + collapse internal whitespace. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Returns pairs of display names that are likely the same person
 * (same words regardless of order, case-insensitive).
 * Surfaced in the UI as a warning — never auto-merged.
 */
export function detectNameSimilarities(
  displayNames: string[]
): Array<[string, string]> {
  const normalized = displayNames.map(normalizeName);
  const pairs: Array<[string, string]> = [];

  for (let i = 0; i < displayNames.length; i++) {
    for (let j = i + 1; j < displayNames.length; j++) {
      if (
        normalized[i] !== normalized[j] &&
        wordsMatch(normalized[i], normalized[j])
      ) {
        pairs.push([displayNames[i], displayNames[j]]);
      }
    }
  }
  return pairs;
}

function wordsMatch(a: string, b: string): boolean {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  const shared = [...wa].filter((w) => wb.has(w)).length;
  // Flag if all words of the shorter name appear in the longer name
  return shared >= Math.min(wa.size, wb.size) && shared > 0;
}
