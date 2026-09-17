import { describe, it, expect } from "vitest";
import { generateBracket, suggestStartingPhase, resolveKnockoutPodium } from "../bracket";
import type { PairRef } from "../bracket";

function makePairs(n: number): PairRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `pair${i + 1}`, seed: i + 1 }));
}

describe("generateBracket", () => {
  it("2 pairs → single final match", () => {
    const bracket = generateBracket(makePairs(2));
    expect(bracket).toHaveLength(1);
    expect(bracket[0].phase).toBe("final");
    expect(bracket[0].pairAId).toBe("pair1");
    expect(bracket[0].pairBId).toBe("pair2");
  });

  it("4 pairs → 2 semis + final + terceiro", () => {
    const bracket = generateBracket(makePairs(4));
    const phases = bracket.map((m) => m.phase);
    expect(phases.filter((p) => p === "semis")).toHaveLength(2);
    expect(phases.filter((p) => p === "final")).toHaveLength(1);
    expect(phases.filter((p) => p === "terceiro")).toHaveLength(1);
  });

  it("4 pairs: semis seeded correctly (P1vsP4, P2vsP3)", () => {
    const bracket = generateBracket(makePairs(4));
    const semis = bracket.filter((m) => m.phase === "semis");
    const s1 = semis.find((m) => m.bracketPosition === 1)!;
    const s2 = semis.find((m) => m.bracketPosition === 2)!;
    expect(s1.pairAId).toBe("pair1");
    expect(s1.pairBId).toBe("pair4");
    expect(s2.pairAId).toBe("pair2");
    expect(s2.pairBId).toBe("pair3");
  });

  it("6 pairs → quartas (P3vsP6, P4vsP5) + 2 semis + final + terceiro", () => {
    const bracket = generateBracket(makePairs(6));
    const quartas = bracket.filter((m) => m.phase === "quartas");
    expect(quartas).toHaveLength(2);
    // P3 vs P6
    expect(quartas.some((m) => m.pairAId === "pair3" && m.pairBId === "pair6")).toBe(true);
    // P4 vs P5
    expect(quartas.some((m) => m.pairAId === "pair4" && m.pairBId === "pair5")).toBe(true);
    // P1 and P2 have byes (pre-filled in semis)
    const semis = bracket.filter((m) => m.phase === "semis");
    expect(semis.some((m) => m.pairAId === "pair1")).toBe(true);
    expect(semis.some((m) => m.pairAId === "pair2")).toBe(true);
  });

  it("8 pairs → 4 quartas + 2 semis + final + terceiro", () => {
    const bracket = generateBracket(makePairs(8));
    expect(bracket.filter((m) => m.phase === "quartas")).toHaveLength(4);
    expect(bracket.filter((m) => m.phase === "semis")).toHaveLength(2);
    expect(bracket.filter((m) => m.phase === "final")).toHaveLength(1);
    expect(bracket.filter((m) => m.phase === "terceiro")).toHaveLength(1);
  });

  it("8 pairs: top seed vs bottom seed in quartas", () => {
    const bracket = generateBracket(makePairs(8));
    const q1 = bracket.find((m) => m.phase === "quartas" && m.bracketPosition === 1)!;
    expect(q1.pairAId).toBe("pair1");
    expect(q1.pairBId).toBe("pair8");
  });

  it("throws for unsupported pair count", () => {
    expect(() => generateBracket(makePairs(3))).toThrow();
    expect(() => generateBracket(makePairs(7))).toThrow();
    expect(() => generateBracket(makePairs(9))).toThrow();
  });
});

describe("suggestStartingPhase", () => {
  it("2 pairs → final", () => expect(suggestStartingPhase(2)).toBe("final"));
  it("4 pairs → semis", () => expect(suggestStartingPhase(4)).toBe("semis"));
  it("6 pairs → quartas", () => expect(suggestStartingPhase(6)).toBe("quartas"));
  it("8 pairs → quartas", () => expect(suggestStartingPhase(8)).toBe("quartas"));
});

describe("resolveKnockoutPodium", () => {
  it("resolves champion, vice, 3rd and 4th when 3rd place match was played", () => {
    const matches = [
      { phase: "semis" as const, pair_a_id: "p1", pair_b_id: "p4", winner_pair_id: "p1" },
      { phase: "semis" as const, pair_a_id: "p2", pair_b_id: "p3", winner_pair_id: "p2" },
      { phase: "final" as const, pair_a_id: "p1", pair_b_id: "p2", winner_pair_id: "p1" },
      { phase: "terceiro" as const, pair_a_id: "p4", pair_b_id: "p3", winner_pair_id: "p3" },
    ];
    const podium = resolveKnockoutPodium(matches);
    expect(podium.champPairId).toBe("p1");
    expect(podium.vicePairId).toBe("p2");
    expect(podium.terceiroPairId).toBe("p3");
    expect(podium.quartoPairId).toBe("p4");
  });

  it("handles unplayed 3rd place match gracefully", () => {
    const matches = [
      { phase: "semis" as const, pair_a_id: "p1", pair_b_id: "p4", winner_pair_id: "p1" },
      { phase: "semis" as const, pair_a_id: "p2", pair_b_id: "p3", winner_pair_id: "p2" },
      { phase: "final" as const, pair_a_id: "p1", pair_b_id: "p2", winner_pair_id: "p1" },
      { phase: "terceiro" as const, pair_a_id: "p4", pair_b_id: "p3", winner_pair_id: null },
    ];
    const podium = resolveKnockoutPodium(matches);
    expect(podium.champPairId).toBe("p1");
    expect(podium.vicePairId).toBe("p2");
    expect(podium.terceiroPairId).toBeNull();
    expect(podium.semiLoserPairIds).toContain("p4");
    expect(podium.semiLoserPairIds).toContain("p3");
  });
});
