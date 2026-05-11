import { describe, it, expect } from "vitest";
import {
  computePlayerPoints,
  normalizeName,
  detectNameSimilarities,
  DEFAULT_POINTS_CONFIG,
} from "../ranking";
import type { TournamentPlayerResult } from "../ranking";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Paulo Laux  ")).toBe("paulo laux");
  });
  it("collapses extra spaces", () => {
    expect(normalizeName("Paulo   Laux")).toBe("paulo laux");
  });
});

describe("computePlayerPoints", () => {
  function make(
    overrides: Partial<TournamentPlayerResult> = {}
  ): TournamentPlayerResult {
    return {
      playerId: "p1",
      playerDisplayName: "Paulo Laux",
      victoriesInGroup: 0,
      knockoutResult: "none",
      ...overrides,
    };
  }

  it("champion gets maximum points", () => {
    const row = computePlayerPoints(make({ victoriesInGroup: 3, knockoutResult: "campeao" }), DEFAULT_POINTS_CONFIG);
    expect(row.total_pts).toBe(
      DEFAULT_POINTS_CONFIG.pts_participacao +
        3 * DEFAULT_POINTS_CONFIG.pts_por_vitoria_grupo +
        DEFAULT_POINTS_CONFIG.pts_campeao
    );
  });

  it("participant with 0 wins gets only participation points", () => {
    const row = computePlayerPoints(make(), DEFAULT_POINTS_CONFIG);
    expect(row.total_pts).toBe(DEFAULT_POINTS_CONFIG.pts_participacao);
    expect(row.pts_eliminatorias).toBe(0);
    expect(row.pts_vitorias).toBe(0);
  });

  it("vice gets pts_vice, not pts_campeao", () => {
    const row = computePlayerPoints(make({ knockoutResult: "vice" }), DEFAULT_POINTS_CONFIG);
    expect(row.pts_eliminatorias).toBe(DEFAULT_POINTS_CONFIG.pts_vice);
  });

  it("normalizes player_name", () => {
    const row = computePlayerPoints(make({ playerDisplayName: "  Ana Lima  " }), DEFAULT_POINTS_CONFIG);
    expect(row.player_name).toBe("ana lima");
    expect(row.player_display_name).toBe("  Ana Lima  ");
  });

  it("default config: 16 players, 3 group wins, semi result", () => {
    const row = computePlayerPoints(make({ victoriesInGroup: 3, knockoutResult: "semis" }), DEFAULT_POINTS_CONFIG);
    expect(row.total_pts).toBe(30 + 3 * 20 + 80); // 170
  });
});

describe("detectNameSimilarities", () => {
  it("detects same name with different casing", () => {
    const pairs = detectNameSimilarities(["Paulo Laux", "paulo laux"]);
    // different normalized? "paulo laux" === "paulo laux" → same after normalize → NOT flagged
    // Actually same normalized → not a pair (spec: only flag DIFFERENT normalized names)
    expect(pairs).toHaveLength(0);
  });

  it("detects probable duplicates with word reordering", () => {
    const pairs = detectNameSimilarities(["Laux Paulo", "Paulo Laux"]);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("does not flag completely different names", () => {
    const pairs = detectNameSimilarities(["Ana Lima", "Bruno Costa"]);
    expect(pairs).toHaveLength(0);
  });
});
