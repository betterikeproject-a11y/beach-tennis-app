export type MatchSlot = {
  matchNumber: number;
  dupla1: [number, number]; // indices into group players array
  dupla2: [number, number];
};

// Every player plays 3 matches, each with a different partner.
const SCHEDULE_4: MatchSlot[] = [
  { matchNumber: 1, dupla1: [0, 1], dupla2: [2, 3] },
  { matchNumber: 2, dupla1: [0, 2], dupla2: [1, 3] },
  { matchNumber: 3, dupla1: [0, 3], dupla2: [1, 2] },
];

// Every player plays 4 matches. Verified: each of A-E appears exactly 4 times.
const SCHEDULE_5: MatchSlot[] = [
  { matchNumber: 1, dupla1: [0, 1], dupla2: [2, 3] },
  { matchNumber: 2, dupla1: [0, 2], dupla2: [1, 4] },
  { matchNumber: 3, dupla1: [0, 3], dupla2: [2, 4] },
  { matchNumber: 4, dupla1: [0, 4], dupla2: [1, 3] },
  { matchNumber: 5, dupla1: [1, 2], dupla2: [3, 4] },
];

export type GroupMatchInsert = {
  group_id: string;
  match_number: number;
  dupla1_player1_id: string;
  dupla1_player2_id: string;
  dupla2_player1_id: string;
  dupla2_player2_id: string;
};

export function generateGroupMatches(
  playerIds: string[],
  groupId: string
): GroupMatchInsert[] {
  const n = playerIds.length;
  if (n !== 4 && n !== 5) {
    throw new Error(`Tamanho de grupo inválido: ${n}. Apenas grupos de 4 ou 5 são suportados.`);
  }
  const schedule = n === 4 ? SCHEDULE_4 : SCHEDULE_5;
  return schedule.map((slot) => ({
    group_id: groupId,
    match_number: slot.matchNumber,
    dupla1_player1_id: playerIds[slot.dupla1[0]],
    dupla1_player2_id: playerIds[slot.dupla1[1]],
    dupla2_player1_id: playerIds[slot.dupla2[0]],
    dupla2_player2_id: playerIds[slot.dupla2[1]],
  }));
}

/** Validates a beach tennis set score. Returns true if the score is legal. */
export function isValidScore(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0 || a > 7 || b > 7) return false;
  if (a === b) return false;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  if (hi === 6) return lo <= 4;
  if (hi === 7) return lo === 5 || lo === 6;
  return false;
}
