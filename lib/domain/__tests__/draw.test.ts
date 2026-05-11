import { describe, it, expect } from "vitest";
import { computeGroupSizes, drawGroups } from "../draw";
import type { DrawPlayer } from "../draw";

// ── computeGroupSizes ────────────────────────────────────────────────────────

describe("computeGroupSizes", () => {
  it("12 players → 3 groups of 4", () => {
    expect(computeGroupSizes(12).sort()).toEqual([4, 4, 4]);
  });

  it("13 players → 3 groups [5,4,4]", () => {
    const sizes = computeGroupSizes(13).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 4, 4]);
  });

  it("14 players → 3 groups [5,5,4] (not 4×3 which violates min-4 rule)", () => {
    const sizes = computeGroupSizes(14).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 5, 4]);
  });

  it("15 players → 3 groups [5,5,5]", () => {
    expect(computeGroupSizes(15).sort()).toEqual([5, 5, 5]);
  });

  it("16 players → 4 groups of 4", () => {
    expect(computeGroupSizes(16).sort()).toEqual([4, 4, 4, 4]);
  });

  it("17 players → 4 groups [5,4,4,4]", () => {
    const sizes = computeGroupSizes(17).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 4, 4, 4]);
  });

  it("18 players → 4 groups [5,5,4,4]", () => {
    const sizes = computeGroupSizes(18).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 5, 4, 4]);
  });

  it("20 players → 5 groups of 4", () => {
    expect(computeGroupSizes(20).sort()).toEqual([4, 4, 4, 4, 4]);
  });

  it("25 players → 6 groups [5,4,4,4,4,4]", () => {
    const sizes = computeGroupSizes(25).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 4, 4, 4, 4, 4]);
  });

  it("32 players → 8 groups of 4", () => {
    expect(computeGroupSizes(32).sort()).toEqual([4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it("never produces a group smaller than 4 (valid range 12-32)", () => {
    for (let n = 12; n <= 32; n++) {
      const sizes = computeGroupSizes(n);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(4);
    }
  });

  it("never produces a group larger than 5 (valid range 12-32)", () => {
    for (let n = 12; n <= 32; n++) {
      const sizes = computeGroupSizes(n);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(5);
    }
  });

  it("sizes always sum to N (valid range 12-32)", () => {
    for (let n = 12; n <= 32; n++) {
      const sizes = computeGroupSizes(n);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  it("throws for N < 12", () => {
    expect(() => computeGroupSizes(11)).toThrow();
  });

  it("throws for N > 32", () => {
    expect(() => computeGroupSizes(33)).toThrow();
  });
});

// ── drawGroups ────────────────────────────────────────────────────────────────

function makePlayers(n: number, seeds = 0): DrawPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Jogador ${i + 1}`,
    isCabecaDeChave: i < seeds,
  }));
}

describe("drawGroups — open draw", () => {
  it("16 players → 4 groups of 4, each player in exactly one group", () => {
    const players = makePlayers(16);
    const draw = drawGroups(players, false);
    expect(draw).toHaveLength(4);
    const allIds = draw.flatMap((g) => g.players.map((p) => p.id));
    expect(new Set(allIds).size).toBe(16);
    draw.forEach((g) => expect(g.players).toHaveLength(4));
  });

  it("13 players → groups sum to 13", () => {
    const players = makePlayers(13);
    const draw = drawGroups(players, false);
    const total = draw.reduce((acc, g) => acc + g.players.length, 0);
    expect(total).toBe(13);
  });

  it("32 players → 8 groups of 4", () => {
    const draw = drawGroups(makePlayers(32), false);
    expect(draw).toHaveLength(8);
    draw.forEach((g) => expect(g.players).toHaveLength(4));
  });
});

describe("drawGroups — seeded draw", () => {
  it("16 players, 4 seeds → exactly 1 seed per group", () => {
    const players = makePlayers(16, 4);
    const draw = drawGroups(players, true);
    draw.forEach((g) => {
      const seeds = g.players.filter((p) => p.isCabecaDeChave);
      expect(seeds).toHaveLength(1);
    });
  });

  it("throws when seed count ≠ group count", () => {
    const players = makePlayers(16, 2); // 4 groups but only 2 seeds
    expect(() => drawGroups(players, true)).toThrow();
  });

  it("13 players, 3 seeds → 1 seed per group, all players distributed", () => {
    const players = makePlayers(13, 3);
    const draw = drawGroups(players, true);
    const allIds = draw.flatMap((g) => g.players.map((p) => p.id));
    expect(new Set(allIds).size).toBe(13);
    draw.forEach((g) => {
      expect(g.players.filter((p) => p.isCabecaDeChave)).toHaveLength(1);
    });
  });
});
