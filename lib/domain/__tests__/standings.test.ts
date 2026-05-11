import { describe, it, expect } from "vitest";
import { computeGroupStandings, computeOverallStandings } from "../standings";
import type { MatchRecord, PlayerRef } from "../standings";

const players: PlayerRef[] = [
  { id: "a", name: "Ana" },
  { id: "b", name: "Bruno" },
  { id: "c", name: "Carla" },
  { id: "d", name: "Diego" },
];

function match(
  id: string,
  d1p1: string, d1p2: string,
  d2p1: string, d2p2: string,
  s1: number | null, s2: number | null
): MatchRecord {
  return { id, dupla1_player1_id: d1p1, dupla1_player2_id: d1p2, dupla2_player1_id: d2p1, dupla2_player2_id: d2p2, score_dupla1: s1, score_dupla2: s2 };
}

describe("computeGroupStandings", () => {
  it("all matches unplayed → everyone has 0 points", () => {
    const matches: MatchRecord[] = [
      match("m1", "a", "b", "c", "d", null, null),
      match("m2", "a", "c", "b", "d", null, null),
      match("m3", "a", "d", "b", "c", null, null),
    ];
    const standings = computeGroupStandings(players, matches);
    standings.forEach((s) => {
      expect(s.wins).toBe(0);
      expect(s.points).toBe(0);
    });
  });

  it("correctly counts wins and games", () => {
    // A+B beat C+D 6-2, A+C beat B+D 6-4, A+D lose to B+C 3-6
    const matches: MatchRecord[] = [
      match("m1", "a", "b", "c", "d", 6, 2),
      match("m2", "a", "c", "b", "d", 6, 4),
      match("m3", "a", "d", "b", "c", 3, 6),
    ];
    const standings = computeGroupStandings(players, matches);
    const a = standings.find((s) => s.playerId === "a")!;
    // A played all 3. Won m1, m2, lost m3
    expect(a.wins).toBe(2);
    expect(a.gamesFor).toBe(6 + 6 + 3);
    expect(a.gamesAgainst).toBe(2 + 4 + 6);
    expect(a.points).toBe(6);
  });

  it("sorts: points → saldo → gamesFor → name", () => {
    // craft a perfect tie on everything except name
    const matches: MatchRecord[] = [
      match("m1", "a", "b", "c", "d", 6, 0), // A+B win
      match("m2", "a", "c", "b", "d", 0, 6), // B+D win
      match("m3", "a", "d", "b", "c", 6, 0), // A+D win
    ];
    // A: m1(W), m2(L), m3(W) → 2 wins, gamesFor=12, gamesAgainst=6, saldo=6, pts=6
    // B: m1(W), m2(W), m3(L) → 2 wins, gamesFor=12, gamesAgainst=6, saldo=6, pts=6
    // check name tiebreaker
    const standings = computeGroupStandings(players, matches);
    const aPos = standings.findIndex((s) => s.playerId === "a");
    const bPos = standings.findIndex((s) => s.playerId === "b");
    // Ana comes before Bruno alphabetically
    expect(aPos).toBeLessThan(bPos);
  });

  it("position numbers are 1-indexed and sequential", () => {
    const matches: MatchRecord[] = [
      match("m1", "a", "b", "c", "d", 6, 0),
      match("m2", "a", "c", "b", "d", 6, 0),
      match("m3", "a", "d", "b", "c", 6, 0),
    ];
    const standings = computeGroupStandings(players, matches);
    standings.forEach((s, i) => expect(s.position).toBe(i + 1));
  });
});

describe("computeOverallStandings", () => {
  it("merges multiple groups and re-ranks globally", () => {
    const g1 = computeGroupStandings(
      [{ id: "a", name: "Ana" }, { id: "b", name: "Bruno" },
       { id: "c", name: "Carla" }, { id: "d", name: "Diego" }],
      [match("m1", "a", "b", "c", "d", 6, 0), match("m2", "a", "c", "b", "d", 6, 0), match("m3", "a", "d", "b", "c", 6, 0)]
    );
    const g2 = computeGroupStandings(
      [{ id: "e", name: "Eduardo" }, { id: "f", name: "Fernanda" },
       { id: "g", name: "Gabriel" }, { id: "h", name: "Helena" }],
      [match("m4", "e", "f", "g", "h", 6, 0), match("m5", "e", "g", "f", "h", 6, 0), match("m6", "e", "h", "f", "g", 6, 0)]
    );
    const overall = computeOverallStandings([g1, g2]);
    expect(overall).toHaveLength(8);
    expect(overall[0].position).toBe(1);
    expect(overall[7].position).toBe(8);
  });
});
