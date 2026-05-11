// NOTE on 6-pair bracket: awaiting confirmation from organizer.
// Current implementation uses standard "byes to top seeds" approach:
//   quartas: P3vsP6, P4vsP5  (P1 and P2 advance directly to semis)
//   semis:   P1 vs winner(P4vsP5), P2 vs winner(P3vsP6)
// If the preference is D1vsD6/D2vsD5/D3vsD4 as three quartas matches,
// the advanceSemisFrom6 logic below needs adjustment.

export type KnockoutPhase = "quartas" | "semis" | "final" | "terceiro";

export type BracketMatch = {
  phase: KnockoutPhase;
  bracketPosition: number;
  pairAId: string | null; // seed index into sorted pairs array, resolved by caller
  pairBId: string | null;
};

export type PairRef = { id: string; seed: number };

/**
 * Generates the initial KnockoutMatch rows for a tournament.
 * Supported pair counts: 2, 4, 6, 8.
 * Pairs must be sorted by seed (seed 1 = best).
 */
export function generateBracket(pairs: PairRef[]): BracketMatch[] {
  const sorted = [...pairs].sort((a, b) => a.seed - b.seed);
  const n = sorted.length;

  if (n === 2) return bracket2(sorted);
  if (n === 4) return bracket4(sorted);
  if (n === 6) return bracket6(sorted);
  if (n === 8) return bracket8(sorted);

  throw new Error(
    `Número de duplas inválido: ${n}. Suportados: 2, 4, 6 ou 8 duplas.`
  );
}

// ── 2 pairs: direct final ─────────────────────────────────────────────────

function bracket2(p: PairRef[]): BracketMatch[] {
  return [
    { phase: "final", bracketPosition: 1, pairAId: p[0].id, pairBId: p[1].id },
  ];
}

// ── 4 pairs: semis → final + terceiro ────────────────────────────────────

function bracket4(p: PairRef[]): BracketMatch[] {
  return [
    { phase: "semis", bracketPosition: 1, pairAId: p[0].id, pairBId: p[3].id },
    { phase: "semis", bracketPosition: 2, pairAId: p[1].id, pairBId: p[2].id },
    { phase: "final", bracketPosition: 1, pairAId: null, pairBId: null },
    { phase: "terceiro", bracketPosition: 1, pairAId: null, pairBId: null },
  ];
}

// ── 6 pairs: P1 & P2 have byes → quartas (P3vsP6, P4vsP5) → semis → final ──

function bracket6(p: PairRef[]): BracketMatch[] {
  return [
    // Quartas: bottom 4 seeds play
    { phase: "quartas", bracketPosition: 1, pairAId: p[2].id, pairBId: p[5].id }, // P3 vs P6
    { phase: "quartas", bracketPosition: 2, pairAId: p[3].id, pairBId: p[4].id }, // P4 vs P5
    // Semis: top 2 seeds pre-filled (bye), opponents come from quartas
    { phase: "semis", bracketPosition: 1, pairAId: p[0].id, pairBId: null }, // P1 vs winner Q2
    { phase: "semis", bracketPosition: 2, pairAId: p[1].id, pairBId: null }, // P2 vs winner Q1
    { phase: "final", bracketPosition: 1, pairAId: null, pairBId: null },
    { phase: "terceiro", bracketPosition: 1, pairAId: null, pairBId: null },
  ];
}

// ── 8 pairs: quartas → semis → final + terceiro ───────────────────────────

function bracket8(p: PairRef[]): BracketMatch[] {
  return [
    { phase: "quartas", bracketPosition: 1, pairAId: p[0].id, pairBId: p[7].id },
    { phase: "quartas", bracketPosition: 2, pairAId: p[1].id, pairBId: p[6].id },
    { phase: "quartas", bracketPosition: 3, pairAId: p[2].id, pairBId: p[5].id },
    { phase: "quartas", bracketPosition: 4, pairAId: p[3].id, pairBId: p[4].id },
    { phase: "semis", bracketPosition: 1, pairAId: null, pairBId: null }, // winners Q1 vs Q4
    { phase: "semis", bracketPosition: 2, pairAId: null, pairBId: null }, // winners Q2 vs Q3
    { phase: "final", bracketPosition: 1, pairAId: null, pairBId: null },
    { phase: "terceiro", bracketPosition: 1, pairAId: null, pairBId: null },
  ];
}

// ── Advancement: which next-round match does a quartas/semis winner feed? ──

type AdvancementRule = {
  fromPhase: KnockoutPhase;
  fromPosition: number;
  toPhase: KnockoutPhase;
  toPosition: number;
  slot: "A" | "B"; // which slot (pairAId or pairBId) in the target match
};

export const ADVANCEMENT_RULES: Record<number, AdvancementRule[]> = {
  // 4-pair tournament
  4: [
    { fromPhase: "semis", fromPosition: 1, toPhase: "final",    toPosition: 1, slot: "A" },
    { fromPhase: "semis", fromPosition: 2, toPhase: "final",    toPosition: 1, slot: "B" },
    { fromPhase: "semis", fromPosition: 1, toPhase: "terceiro", toPosition: 1, slot: "A" }, // loser
    { fromPhase: "semis", fromPosition: 2, toPhase: "terceiro", toPosition: 1, slot: "B" }, // loser
  ],
  // 6-pair tournament
  6: [
    { fromPhase: "quartas", fromPosition: 1, toPhase: "semis", toPosition: 2, slot: "B" }, // winner Q1 → faces P2
    { fromPhase: "quartas", fromPosition: 2, toPhase: "semis", toPosition: 1, slot: "B" }, // winner Q2 → faces P1
    { fromPhase: "semis", fromPosition: 1, toPhase: "final",    toPosition: 1, slot: "A" },
    { fromPhase: "semis", fromPosition: 2, toPhase: "final",    toPosition: 1, slot: "B" },
    { fromPhase: "semis", fromPosition: 1, toPhase: "terceiro", toPosition: 1, slot: "A" },
    { fromPhase: "semis", fromPosition: 2, toPhase: "terceiro", toPosition: 1, slot: "B" },
  ],
  // 8-pair tournament
  8: [
    { fromPhase: "quartas", fromPosition: 1, toPhase: "semis", toPosition: 1, slot: "A" },
    { fromPhase: "quartas", fromPosition: 4, toPhase: "semis", toPosition: 1, slot: "B" },
    { fromPhase: "quartas", fromPosition: 2, toPhase: "semis", toPosition: 2, slot: "A" },
    { fromPhase: "quartas", fromPosition: 3, toPhase: "semis", toPosition: 2, slot: "B" },
    { fromPhase: "semis", fromPosition: 1, toPhase: "final",    toPosition: 1, slot: "A" },
    { fromPhase: "semis", fromPosition: 2, toPhase: "final",    toPosition: 1, slot: "B" },
    { fromPhase: "semis", fromPosition: 1, toPhase: "terceiro", toPosition: 1, slot: "A" },
    { fromPhase: "semis", fromPosition: 2, toPhase: "terceiro", toPosition: 1, slot: "B" },
  ],
};

export function getAdvancementRule(
  totalPairs: number,
  fromPhase: KnockoutPhase,
  fromPosition: number,
  isLoser: boolean
): AdvancementRule | undefined {
  const rules = ADVANCEMENT_RULES[totalPairs] ?? [];
  return rules.find(
    (r) =>
      r.fromPhase === fromPhase &&
      r.fromPosition === fromPosition &&
      // Losers advance to terceiro, winners to final/semis/quartas
      (isLoser ? r.toPhase === "terceiro" : r.toPhase !== "terceiro")
  );
}

/** Suggests the starting phase based on pair count. */
export function suggestStartingPhase(
  pairCount: number
): KnockoutPhase | null {
  if (pairCount <= 2) return "final";
  if (pairCount <= 4) return "semis";
  if (pairCount <= 8) return "quartas";
  return null;
}
