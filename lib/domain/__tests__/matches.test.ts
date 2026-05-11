import { describe, it, expect } from "vitest";
import { generateGroupMatches, isValidScore } from "../matches";

// ── generateGroupMatches ──────────────────────────────────────────────────────

describe("generateGroupMatches — group of 4", () => {
  const ids = ["a", "b", "c", "d"];
  const matches = generateGroupMatches(ids, "g1");

  it("produces 3 matches", () => expect(matches).toHaveLength(3));

  it("every player appears in exactly 3 matches", () => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      for (const id of [m.dupla1_player1_id, m.dupla1_player2_id, m.dupla2_player1_id, m.dupla2_player2_id]) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    ids.forEach((id) => expect(counts[id]).toBe(3));
  });

  it("no player is on both duplas in the same match", () => {
    for (const m of matches) {
      const d1 = new Set([m.dupla1_player1_id, m.dupla1_player2_id]);
      const d2 = new Set([m.dupla2_player1_id, m.dupla2_player2_id]);
      expect([...d1].some((id) => d2.has(id))).toBe(false);
    }
  });

  it("each pair of partners appears at most once", () => {
    const seen = new Set<string>();
    for (const m of matches) {
      const p1 = [m.dupla1_player1_id, m.dupla1_player2_id].sort().join("-");
      const p2 = [m.dupla2_player1_id, m.dupla2_player2_id].sort().join("-");
      expect(seen.has(p1)).toBe(false);
      expect(seen.has(p2)).toBe(false);
      seen.add(p1);
      seen.add(p2);
    }
  });
});

describe("generateGroupMatches — group of 5", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const matches = generateGroupMatches(ids, "g1");

  it("produces 5 matches", () => expect(matches).toHaveLength(5));

  it("every player appears in exactly 4 matches", () => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      for (const id of [m.dupla1_player1_id, m.dupla1_player2_id, m.dupla2_player1_id, m.dupla2_player2_id]) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    ids.forEach((id) => expect(counts[id]).toBe(4));
  });
});

describe("generateGroupMatches — invalid sizes", () => {
  it("throws for group of 3", () => {
    expect(() => generateGroupMatches(["a", "b", "c"], "g1")).toThrow();
  });
  it("throws for group of 6", () => {
    expect(() => generateGroupMatches(["a","b","c","d","e","f"], "g1")).toThrow();
  });
});

// ── isValidScore ──────────────────────────────────────────────────────────────

describe("isValidScore", () => {
  const valid: [number, number][] = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4],
    [7, 5], [7, 6],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6],
    [5, 7], [6, 7],
  ];

  const invalid: [number, number][] = [
    [6, 5], [6, 6], [7, 7], [7, 4], [7, 3],
    [5, 5], [0, 0], [8, 0], [-1, 6], [6, 8],
  ];

  valid.forEach(([a, b]) => {
    it(`${a}×${b} is valid`, () => expect(isValidScore(a, b)).toBe(true));
  });

  invalid.forEach(([a, b]) => {
    it(`${a}×${b} is invalid`, () => expect(isValidScore(a, b)).toBe(false));
  });
});
