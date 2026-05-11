"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { computeGroupStandings, computeOverallStandings } from "@/lib/domain/standings";
import { generateBracket, suggestStartingPhase } from "@/lib/domain/bracket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Player, Group, GroupMatch } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";

export default function ClassificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [overall, setOverall] = useState<PlayerStanding[]>([]);
  const [numClassifica, setNumClassifica] = useState(3);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [swapMode, setSwapMode] = useState<number | null>(null); // pair index being swapped

  useEffect(() => {
    async function load() {
      const [{ data: groups }, { data: members }, { data: matches }, { data: players }] = await Promise.all([
        supabase.from("groups").select("*").eq("tournament_id", id),
        supabase.from("group_members").select("*"),
        supabase.from("group_matches").select("*"),
        supabase.from("players").select("*").eq("tournament_id", id),
      ]);

      const perGroup = (groups ?? []).map((g: Group) => {
        const memberIds = (members ?? []).filter((m) => m.group_id === g.id).map((m) => m.player_id);
        const gPlayers = (players ?? []).filter((p: Player) => memberIds.includes(p.id));
        const gMatches = (matches ?? []).filter((m: GroupMatch) => m.group_id === g.id);
        return computeGroupStandings(
          gPlayers.map((p: Player) => ({ id: p.id, name: p.name })),
          gMatches
        );
      });

      setOverall(computeOverallStandings(perGroup));
      setLoading(false);
    }
    load();
  }, [id]);

  // Build pairs from classified players
  const classified = overall.filter((s) => {
    // top N per group: each group's standings, take top numClassifica
    // We re-derive per-group positions inline
    return true; // for display, show overall; actual filtering is by per-group position
  });

  // Pair up by overall rank: 1+2, 3+4, 5+6, ...
  const [pairs, setPairs] = useState<[PlayerStanding, PlayerStanding][]>([]);

  useEffect(() => {
    // Take top numClassifica per group from overall standings
    // Re-derive: for each group position, take only players positioned <= numClassifica in their group
    async function buildPairs() {
      const [{ data: groups }, { data: members }, { data: matches }, { data: players }] = await Promise.all([
        supabase.from("groups").select("*").eq("tournament_id", id),
        supabase.from("group_members").select("*"),
        supabase.from("group_matches").select("*"),
        supabase.from("players").select("*").eq("tournament_id", id),
      ]);

      const perGroupClassified: PlayerStanding[][] = [];

      for (const g of (groups ?? [])) {
        const memberIds = (members ?? []).filter((m: { group_id: string }) => m.group_id === g.id).map((m: { player_id: string }) => m.player_id);
        const gPlayers = (players ?? []).filter((p: Player) => memberIds.includes(p.id));
        const gMatches = (matches ?? []).filter((m: GroupMatch) => m.group_id === g.id);
        const standings = computeGroupStandings(
          gPlayers.map((p: Player) => ({ id: p.id, name: p.name })),
          gMatches
        );
        perGroupClassified.push(standings.filter((s) => s.position <= numClassifica));
      }

      const overall = computeOverallStandings(perGroupClassified);
      // Pair: 1+2, 3+4, ...
      const newPairs: [PlayerStanding, PlayerStanding][] = [];
      for (let i = 0; i + 1 < overall.length; i += 2) {
        newPairs.push([overall[i], overall[i + 1]]);
      }
      setPairs(newPairs);
    }
    buildPairs();
  }, [id, numClassifica]);

  function swapPlayer(fromPairIdx: number, fromSlot: 0 | 1, toPairIdx: number, toSlot: 0 | 1) {
    setPairs((prev) => {
      const next = prev.map((pair) => [...pair] as [PlayerStanding, PlayerStanding]);
      const tmp = next[fromPairIdx][fromSlot];
      next[fromPairIdx][fromSlot] = next[toPairIdx][toSlot];
      next[toPairIdx][toSlot] = tmp;
      return next;
    });
    setSwapMode(null);
  }

  async function generateKnockout() {
    if (pairs.length === 0) return;
    setGenerating(true);
    try {
      // Delete existing knockout data
      await supabase.from("knockout_pairs").delete().eq("tournament_id", id);
      await supabase.from("knockout_matches").delete().eq("tournament_id", id);

      // Insert pairs
      const pairRows = pairs.map((pair, i) => ({
        tournament_id: id,
        seed: i + 1,
        player1_id: pair[0].playerId,
        player2_id: pair[1].playerId,
      }));
      const { data: insertedPairs, error: pe } = await supabase
        .from("knockout_pairs")
        .insert(pairRows)
        .select("id, seed");
      if (pe || !insertedPairs) throw pe ?? new Error("Falha ao inserir duplas");

      // Generate bracket
      const pairRefs = insertedPairs.map((p: { id: string; seed: number }) => ({ id: p.id, seed: p.seed }));
      const bracket = generateBracket(pairRefs);
      const matchRows = bracket.map((m) => ({
        tournament_id: id,
        phase: m.phase,
        bracket_position: m.bracketPosition,
        pair_a_id: m.pairAId,
        pair_b_id: m.pairBId,
      }));
      const { error: me } = await supabase.from("knockout_matches").insert(matchRows);
      if (me) throw me;

      toast.success("Chaveamento gerado!");
      router.push(`/torneios/${id}/eliminatorias`);
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      setGenerating(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando classificação…</div>;

  const suggestedPhase = suggestStartingPhase(pairs.length);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Classificação Geral</h1>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <label className="block text-sm font-medium">
            Classificados por grupo:
            <input
              type="number"
              min={1} max={5}
              value={numClassifica}
              onChange={(e) => setNumClassifica(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              className="ml-2 w-16 border rounded px-2 py-1 text-center"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {pairs.length} dupla{pairs.length !== 1 ? "s" : ""} classificada{pairs.length !== 1 ? "s" : ""} →{" "}
            {suggestedPhase ? `início nas ${suggestedPhase === "final" ? "Final" : suggestedPhase === "semis" ? "Semis" : "Quartas"}` : "número inválido"}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <Card
            key={i}
            className={`cursor-pointer transition-shadow ${swapMode === i ? "ring-2 ring-orange-400" : ""}`}
            onClick={() => setSwapMode(swapMode === i ? null : i)}
          >
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-orange-500 w-8">D{i + 1}</span>
              <div className="flex-1 text-sm">
                <span className="font-medium">{pair[0].playerName}</span>
                <span className="text-muted-foreground"> + </span>
                <span className="font-medium">{pair[1].playerName}</span>
              </div>
              {swapMode !== null && swapMode !== i && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={(e) => { e.stopPropagation(); swapPlayer(swapMode, 0, i, 0); }}
                >
                  Trocar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {swapMode !== null && (
        <p className="text-sm text-center text-muted-foreground">
          Dupla D{swapMode + 1} selecionada. Toque em outra dupla para trocar.
        </p>
      )}

      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base"
        disabled={pairs.length < 2 || !suggestedPhase || generating}
        onClick={generateKnockout}
      >
        {generating ? "Gerando…" : "Gerar Chaveamento →"}
      </Button>
    </div>
  );
}
