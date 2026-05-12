export type MatchRecord = {
  id: string;
  dupla1_player1_id: string;
  dupla1_player2_id: string;
  dupla2_player1_id: string;
  dupla2_player2_id: string;
  score_dupla1: number | null;
  score_dupla2: number | null;
};

export type PlayerStanding = {
  playerId: string;
  playerName: string;
  wins: number;
  gamesFor: number;
  gamesAgainst: number;
  saldo: number;
  points: number;
  position: number;
};

export type PlayerRef = { id: string; name: string };

/**
 * Computes standings for a single group given its players and matches.
 * Sort order: points DESC → saldo DESC → gamesFor DESC → positionOverride ASC → name ASC.
 */
export function computeGroupStandings(
  players: PlayerRef[],
  matches: MatchRecord[],
  positionOverrides: Record<string, number | null> = {}
): PlayerStanding[] {
  const stats: Record<string, PlayerStanding> = {};

  for (const p of players) {
    stats[p.id] = {
      playerId: p.id,
      playerName: p.name,
      wins: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      saldo: 0,
      points: 0,
      position: 0,
    };
  }

  for (const m of matches) {
    if (m.score_dupla1 === null || m.score_dupla2 === null) continue;

    const d1 = [m.dupla1_player1_id, m.dupla1_player2_id];
    const d2 = [m.dupla2_player1_id, m.dupla2_player2_id];
    const d1Won = m.score_dupla1 > m.score_dupla2;

    for (const id of d1) {
      if (!stats[id]) continue;
      stats[id].gamesFor += m.score_dupla1;
      stats[id].gamesAgainst += m.score_dupla2;
      if (d1Won) stats[id].wins++;
    }
    for (const id of d2) {
      if (!stats[id]) continue;
      stats[id].gamesFor += m.score_dupla2;
      stats[id].gamesAgainst += m.score_dupla1;
      if (!d1Won) stats[id].wins++;
    }
  }

  const list = Object.values(stats).map((s) => ({
    ...s,
    saldo: s.gamesFor - s.gamesAgainst,
    points: s.wins * 3,
  }));

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    const oA = positionOverrides[a.playerId] ?? null;
    const oB = positionOverrides[b.playerId] ?? null;
    if (oA !== null && oB !== null) return oA - oB;
    if (oA !== null) return -1;
    if (oB !== null) return 1;
    return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
  });

  return list.map((s, i) => ({ ...s, position: i + 1 }));
}

/**
 * Merges standings from multiple groups into an overall ranking.
 * Same sort criteria applied globally — used for knockout seeding.
 */
export function computeOverallStandings(
  perGroupStandings: PlayerStanding[][]
): PlayerStanding[] {
  const all = perGroupStandings.flat().map((s) => ({ ...s }));
  all.sort(compareStandings);
  return all.map((s, i) => ({ ...s, position: i + 1 }));
}

function compareStandings(a: PlayerStanding, b: PlayerStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.saldo !== a.saldo) return b.saldo - a.saldo;
  if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
  return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
}
