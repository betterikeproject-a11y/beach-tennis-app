"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isValidScore } from "@/lib/domain/matches";
import { getAdvancementRule } from "@/lib/domain/bracket";
import { computePlayerPoints, DEFAULT_POINTS_CONFIG, normalizeName } from "@/lib/domain/ranking";
import { computeGroupStandings, computeOverallStandings } from "@/lib/domain/standings";
import { ScoreInput } from "@/components/ScoreInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { KnockoutMatch, KnockoutPair, Player, Group, GroupMatch } from "@/lib/types/database";
import type { KnockoutPhase } from "@/lib/domain/bracket";

const PHASE_LABEL: Record<KnockoutPhase, string> = {
  quartas: "Quartas de Final",
  semis: "Semifinais",
  final: "Final",
  terceiro: "Disputa do 3º Lugar",
};

export default function EliminatoriasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [matches, setMatches] = useState<KnockoutMatch[]>([]);
  const [pairs, setPairs] = useState<KnockoutPair[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function loadData() {
    const [{ data: m }, { data: p }, { data: pl }] = await Promise.all([
      supabase.from("knockout_matches").select("*").eq("tournament_id", id).order("bracket_position"),
      supabase.from("knockout_pairs").select("*").eq("tournament_id", id).order("seed"),
      supabase.from("players").select("*").eq("tournament_id", id),
    ]);
    setMatches(m ?? []);
    setPairs(p ?? []);
    setPlayers(pl ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    const ch = supabase
      .channel(`eliminatorias-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "knockout_matches" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  function pairName(pairId: string | null): string {
    if (!pairId) return "A definir";
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return "A definir";
    const p1 = players.find((p) => p.id === pair.player1_id)?.name ?? "?";
    const p2 = players.find((p) => p.id === pair.player2_id)?.name ?? "?";
    return `${p1} / ${p2}`;
  }

  const saveScore = useCallback(async (match: KnockoutMatch, scoreA: number | null, scoreB: number | null) => {
    const bothSet = scoreA !== null && scoreB !== null;
    const valid = bothSet ? isValidScore(scoreA!, scoreB!) : true;
    if (!valid) return;

    const winnerId = bothSet ? (scoreA! > scoreB! ? match.pair_a_id : match.pair_b_id) : null;
    const loserId = bothSet ? (scoreA! > scoreB! ? match.pair_b_id : match.pair_a_id) : null;

    await supabase.from("knockout_matches").update({
      score_a: scoreA, score_b: scoreB, winner_pair_id: winnerId,
    }).eq("id", match.id);

    // Propagate winner to next round
    if (winnerId && bothSet) {
      const totalPairs = pairs.length;
      const winnerRule = getAdvancementRule(totalPairs, match.phase as KnockoutPhase, match.bracket_position, false);
      const loserRule = getAdvancementRule(totalPairs, match.phase as KnockoutPhase, match.bracket_position, true);

      if (winnerRule) {
        const nextMatch = matches.find(
          (m) => m.phase === winnerRule.toPhase && m.bracket_position === winnerRule.toPosition
        );
        if (nextMatch) {
          const update = winnerRule.slot === "A" ? { pair_a_id: winnerId } : { pair_b_id: winnerId };
          await supabase.from("knockout_matches").update(update).eq("id", nextMatch.id);
        }
      }
      if (loserRule && loserId) {
        const nextMatch = matches.find(
          (m) => m.phase === loserRule.toPhase && m.bracket_position === loserRule.toPosition
        );
        if (nextMatch) {
          const update = loserRule.slot === "A" ? { pair_a_id: loserId } : { pair_b_id: loserId };
          await supabase.from("knockout_matches").update(update).eq("id", nextMatch.id);
        }
      }
    }

    toast.success("Placar salvo");
    loadData();
  }, [matches, pairs, id]);

  function handleScoreChange(match: KnockoutMatch, a: number | null, b: number | null) {
    clearTimeout(debounceTimers.current[match.id]);
    setMatches((prev) => prev.map((m) => m.id === match.id ? { ...m, score_a: a, score_b: b } : m));
    debounceTimers.current[match.id] = setTimeout(() => saveScore(match, a, b), 500);
  }

  const finalMatch = matches.find((m) => m.phase === "final");
  const tournamentComplete = finalMatch?.winner_pair_id != null;

  async function finalizeTournament() {
    setFinalizing(true);
    try {
      const config = DEFAULT_POINTS_CONFIG; // TODO: load from DB

      // Get group stats
      const [{ data: groups }, { data: members }, { data: groupMatchData }] = await Promise.all([
        supabase.from("groups").select("*").eq("tournament_id", id),
        supabase.from("group_members").select("*"),
        supabase.from("group_matches").select("*"),
      ]);

      const perGroupStandings = (groups ?? []).map((g: Group) => {
        const groupMembers = (members ?? []).filter((m: { group_id: string }) => m.group_id === g.id);
        const memberIds = groupMembers.map((m: { player_id: string }) => m.player_id);
        const gPlayers = players.filter((p) => memberIds.includes(p.id));
        const gMatches = (groupMatchData ?? []).filter((m: GroupMatch) => m.group_id === g.id);
        const overrides: Record<string, number | null> = {};
        for (const gm of groupMembers) overrides[(gm as { player_id: string; position_override: number | null }).player_id] = (gm as { player_id: string; position_override: number | null }).position_override;
        return computeGroupStandings(gPlayers.map((p) => ({ id: p.id, name: p.name })), gMatches, overrides);
      });
      const overallStandings = computeOverallStandings(perGroupStandings);

      // Determine knockout result per pair
      const champPairId = finalMatch?.winner_pair_id;
      const vicePairId = finalMatch ? (champPairId === finalMatch.pair_a_id ? finalMatch.pair_b_id : finalMatch.pair_a_id) : null;
      const semiLosers = matches.filter((m) => m.phase === "semis" && m.winner_pair_id).map((m) => m.winner_pair_id === m.pair_a_id ? m.pair_b_id : m.pair_a_id);
      const quartasLosers = matches.filter((m) => m.phase === "quartas" && m.winner_pair_id).map((m) => m.winner_pair_id === m.pair_a_id ? m.pair_b_id : m.pair_a_id);

      function pairIdForPlayer(playerId: string): string | null {
        return pairs.find((p) => p.player1_id === playerId || p.player2_id === playerId)?.id ?? null;
      }

      function knockoutResultForPlayer(playerId: string) {
        const pairId = pairIdForPlayer(playerId);
        if (!pairId) return "none" as const;
        if (pairId === champPairId) return "campeao" as const;
        if (pairId === vicePairId) return "vice" as const;
        if (semiLosers.includes(pairId)) return "semis" as const;
        if (quartasLosers.includes(pairId)) return "quartas" as const;
        // Reached knockout but didn't reach quartas final (bye situations)
        const reachedKnockout = pairs.some((p) => p.id === pairId);
        if (reachedKnockout) return "quartas" as const;
        return "none" as const;
      }

      // Compute points per player
      const pointsRows = players.map((player) => {
        const standing = overallStandings.find((s) => s.playerId === player.id);
        const knockoutResult = knockoutResultForPlayer(player.id);
        return computePlayerPoints(
          {
            playerId: player.id,
            playerDisplayName: player.name,
            victoriesInGroup: standing?.wins ?? 0,
            knockoutResult,
          },
          config
        );
      });

      // Delete old and insert new
      await supabase.from("tournament_player_points").delete().eq("tournament_id", id);
      await supabase.from("tournament_player_points").insert(
        pointsRows.map((r) => ({ ...r, tournament_id: id }))
      );

      await supabase.from("tournaments").update({ status: "finalizado" }).eq("id", id);
      toast.success("Torneio finalizado! Ranking atualizado.");
      router.push(`/torneios/${id}`);
    } catch (e) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      setFinalizing(false);
    }
  }

  const phases: KnockoutPhase[] = ["quartas", "semis", "final", "terceiro"];
  const presentPhases = phases.filter((ph) => matches.some((m) => m.phase === ph));

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eliminatórias</h1>

      {presentPhases.map((phase) => (
        <div key={phase} className="space-y-3">
          <h2 className="font-semibold text-base text-muted-foreground uppercase tracking-wide text-sm">
            {PHASE_LABEL[phase]}
          </h2>
          {matches
            .filter((m) => m.phase === phase)
            .sort((a, b) => a.bracket_position - b.bracket_position)
            .map((m) => (
              <Card key={m.id} className={m.winner_pair_id ? "bg-green-50 border-green-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-sm font-medium truncate ${m.winner_pair_id === m.pair_a_id ? "text-green-700 font-bold" : ""}`}>
                        {pairName(m.pair_a_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">vs</p>
                      <p className={`text-sm font-medium truncate ${m.winner_pair_id === m.pair_b_id ? "text-green-700 font-bold" : ""}`}>
                        {pairName(m.pair_b_id)}
                      </p>
                    </div>
                    {m.pair_a_id && m.pair_b_id ? (
                      <ScoreInput
                        scoreA={m.score_a}
                        scoreB={m.score_b}
                        onChange={(a, b) => handleScoreChange(m, a, b)}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Aguardando</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ))}

      {tournamentComplete && (
        <div className="rounded-lg bg-brand-light border border-brand/30 p-4 text-center space-y-3">
          <p className="text-3xl">🏆</p>
          <div className="space-y-1">
            <p className="font-bold text-lg text-brand">Campeão: {pairName(finalMatch?.winner_pair_id ?? null)}</p>
            <p className="text-sm font-medium text-muted-foreground">Vice: {pairName(finalMatch ? (finalMatch.winner_pair_id === finalMatch.pair_a_id ? finalMatch.pair_b_id : finalMatch.pair_a_id) : null)}</p>
          </div>
          <Button
            className="w-full bg-brand hover:bg-brand-hover text-white h-12 text-base"
            onClick={finalizeTournament}
            disabled={finalizing}
          >
            {finalizing ? "Finalizando…" : "Finalizar Torneio e Salvar Ranking"}
          </Button>
        </div>
      )}
    </div>
  );
}
