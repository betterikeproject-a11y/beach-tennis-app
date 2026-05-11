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

type PairEntry = {
  p1: PlayerStanding & { groupNumber: number };
  p2: PlayerStanding & { groupNumber: number };
};

function ordinal(n: number) {
  return `${n}º`;
}

export default function ClassificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [allOverall, setAllOverall] = useState<(PlayerStanding & { groupNumber: number })[]>([]);
  const [numClassifica, setNumClassifica] = useState(3);
  const [pairs, setPairs] = useState<PairEntry[]>([]);
  const [swapTarget, setSwapTarget] = useState<{ pairIdx: number; slot: 0 | 1 } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load all data and build full standings
  useEffect(() => {
    async function load() {
      const [{ data: groups }, { data: members }, { data: matches }, { data: players }] = await Promise.all([
        supabase.from("groups").select("*").eq("tournament_id", id).order("group_number"),
        supabase.from("group_members").select("*"),
        supabase.from("group_matches").select("*"),
        supabase.from("players").select("*").eq("tournament_id", id),
      ]);

      const groupRows = groups ?? [];
      const allPlayers = players ?? [];

      // Build per-group standings and track group numbers
      const perGroupStandings = groupRows.map((g: Group) => {
        const memberIds = (members ?? []).filter((m) => m.group_id === g.id).map((m) => m.player_id);
        const gPlayers = allPlayers.filter((p: Player) => memberIds.includes(p.id));
        const gMatches = (matches ?? []).filter((m: GroupMatch) => m.group_id === g.id);
        const standings = computeGroupStandings(
          gPlayers.map((p: Player) => ({ id: p.id, name: p.name })),
          gMatches
        );
        return standings.map((s) => ({ ...s, groupNumber: g.group_number }));
      });

      // All players overall (for the full table)
      const overall = computeOverallStandings(perGroupStandings).map((s, i) => ({
        ...s,
        groupNumber: perGroupStandings.flat().find((ps) => ps.playerId === s.playerId)?.groupNumber ?? 0,
        position: i + 1,
      }));
      setAllOverall(overall);
      setLoading(false);
    }
    load();
  }, [id]);

  // Rebuild pairs whenever numClassifica or allOverall changes
  useEffect(() => {
    if (allOverall.length === 0) return;

    // Group players back by their groupNumber
    const byGroup: Record<number, typeof allOverall> = {};
    for (const s of allOverall) {
      byGroup[s.groupNumber] = byGroup[s.groupNumber] ?? [];
      byGroup[s.groupNumber].push(s);
    }

    // Sort each group by their original group position (use overall position as proxy within group)
    // Re-rank within each group by the same criteria
    const classified: typeof allOverall = [];
    for (const groupNum of Object.keys(byGroup).map(Number).sort()) {
      const groupStandings = byGroup[groupNum]
        .slice()
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.saldo !== a.saldo) return b.saldo - a.saldo;
          if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
          return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
        });
      classified.push(...groupStandings.slice(0, numClassifica));
    }

    // Overall rank of classified players
    const classifiedOverall = computeOverallStandings(
      Object.keys(byGroup).map((gn) =>
        byGroup[Number(gn)].slice().sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.saldo !== a.saldo) return b.saldo - a.saldo;
          if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
          return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
        }).slice(0, numClassifica)
      )
    ).map((s) => ({
      ...s,
      groupNumber: allOverall.find((ao) => ao.playerId === s.playerId)?.groupNumber ?? 0,
    }));

    const newPairs: PairEntry[] = [];
    for (let i = 0; i + 1 < classifiedOverall.length; i += 2) {
      newPairs.push({ p1: classifiedOverall[i], p2: classifiedOverall[i + 1] });
    }
    setPairs(newPairs);
    setSwapTarget(null);
  }, [allOverall, numClassifica]);

  function handlePlayerClick(pairIdx: number, slot: 0 | 1) {
    if (!swapTarget) {
      setSwapTarget({ pairIdx, slot });
      return;
    }
    if (swapTarget.pairIdx === pairIdx && swapTarget.slot === slot) {
      setSwapTarget(null);
      return;
    }
    // Perform swap
    setPairs((prev) => {
      const next = prev.map((pair) => ({ ...pair }));
      const fromPlayer = slot === 0 ? next[swapTarget.pairIdx].p1 : next[swapTarget.pairIdx].p2;
      const toPlayer = slot === 0 ? next[pairIdx].p1 : next[pairIdx].p2;

      if (swapTarget.slot === 0) next[swapTarget.pairIdx].p1 = toPlayer;
      else next[swapTarget.pairIdx].p2 = toPlayer;

      if (slot === 0) next[pairIdx].p1 = fromPlayer;
      else next[pairIdx].p2 = fromPlayer;

      return next;
    });
    setSwapTarget(null);
  }

  async function generateKnockout() {
    if (pairs.length === 0) return;
    setGenerating(true);
    try {
      await supabase.from("knockout_pairs").delete().eq("tournament_id", id);
      await supabase.from("knockout_matches").delete().eq("tournament_id", id);

      const pairRows = pairs.map((pair, i) => ({
        tournament_id: id,
        seed: i + 1,
        player1_id: pair.p1.playerId,
        player2_id: pair.p2.playerId,
      }));
      const { data: insertedPairs, error: pe } = await supabase
        .from("knockout_pairs")
        .insert(pairRows)
        .select("id, seed");
      if (pe || !insertedPairs) throw pe ?? new Error("Falha ao inserir duplas");

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
  const classifiedIds = new Set(pairs.flatMap((p) => [p.p1.playerId, p.p2.playerId]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Classificação</h1>

      {/* Config */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            Classificados por grupo:
            <input
              type="number"
              min={1}
              max={5}
              value={numClassifica}
              onChange={(e) => setNumClassifica(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              className="w-14 border rounded px-2 py-1 text-center text-sm"
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {pairs.length} dupla{pairs.length !== 1 ? "s" : ""} classificada{pairs.length !== 1 ? "s" : ""} →{" "}
            {suggestedPhase
              ? `início nas ${suggestedPhase === "final" ? "Final" : suggestedPhase === "semis" ? "Semis" : "Quartas"}`
              : "número inválido"}
          </span>
        </CardContent>
      </Card>

      {/* Full standings table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Classificação Geral — Todos os Jogadores</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 overflow-x-auto">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1.5 pr-1 w-6">#</th>
                <th className="text-left py-1.5">Jogador</th>
                <th className="text-center py-1.5 px-1 w-8">Gr.</th>
                <th className="text-center py-1.5 px-1 w-8">V</th>
                <th className="text-center py-1.5 px-1 w-10">G+</th>
                <th className="text-center py-1.5 px-1 w-10">G-</th>
                <th className="text-center py-1.5 px-1 w-12">Saldo</th>
                <th className="text-right py-1.5 pl-1 w-10">Pts</th>
                <th className="text-center py-1.5 pl-2 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {allOverall.map((s) => {
                const isClassified = classifiedIds.has(s.playerId);
                return (
                  <tr
                    key={s.playerId}
                    className={`border-b last:border-0 ${isClassified ? "bg-brand-light" : ""}`}
                  >
                    <td className="py-1.5 pr-1 text-muted-foreground font-mono font-semibold">{s.position}</td>
                    <td className="py-1.5 font-medium max-w-[110px] truncate">{s.playerName}</td>
                    <td className="py-1.5 px-1 text-center text-muted-foreground">{s.groupNumber}</td>
                    <td className="py-1.5 px-1 text-center">{s.wins}</td>
                    <td className="py-1.5 px-1 text-center text-green-700">{s.gamesFor}</td>
                    <td className="py-1.5 px-1 text-center text-red-500">{s.gamesAgainst}</td>
                    <td className={`py-1.5 px-1 text-center font-medium ${s.saldo >= 0 ? "text-green-700" : "text-red-500"}`}>
                      {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                    </td>
                    <td className="py-1.5 pl-1 text-right font-bold">{s.points}</td>
                    <td className="py-1.5 pl-2 text-center">
                      {isClassified && <span className="text-brand font-bold text-xs">✓</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground mt-2">
            Gr. = Grupo · V = Vitórias · G+ = Games ganhos · G- = Games sofridos · Pts = Pontos (3 por vitória) · ✓ = Classificado
          </p>
        </CardContent>
      </Card>

      {/* Pairs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Duplas para o Chaveamento</h2>
          {swapTarget && (
            <button
              onClick={() => setSwapTarget(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cancelar troca
            </button>
          )}
        </div>

        {swapTarget && (
          <p className="text-xs text-brand font-medium text-center bg-brand-light rounded-md py-2">
            Selecione outro jogador para trocar com{" "}
            <strong>
              {swapTarget.slot === 0 ? pairs[swapTarget.pairIdx].p1.playerName : pairs[swapTarget.pairIdx].p2.playerName}
            </strong>
          </p>
        )}

        {pairs.map((pair, i) => {
          const players = [pair.p1, pair.p2] as const;
          return (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-0">
                  {/* Seed badge */}
                  <div className="bg-brand text-white flex flex-col items-center justify-center px-3 py-4 min-w-[52px] self-stretch">
                    <span className="text-xs font-medium opacity-80">Seed</span>
                    <span className="text-xl font-bold leading-none">#{i + 1}</span>
                  </div>

                  {/* Players */}
                  <div className="flex-1 divide-y">
                    {players.map((player, slot) => {
                      const isSelected =
                        swapTarget?.pairIdx === i && swapTarget?.slot === slot;
                      const isSwappable = swapTarget !== null && !(swapTarget.pairIdx === i && swapTarget.slot === slot);
                      return (
                        <button
                          key={player.playerId}
                          onClick={() => handlePlayerClick(i, slot as 0 | 1)}
                          className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? "bg-brand/10 ring-1 ring-inset ring-brand"
                              : isSwappable
                              ? "hover:bg-yellow-50 cursor-pointer"
                              : swapTarget
                              ? "opacity-50"
                              : "hover:bg-muted/50 cursor-pointer"
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold">{player.playerName}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {ordinal(player.position)} geral · Gr.{player.groupNumber} · {player.wins}V · saldo {player.saldo >= 0 ? "+" : ""}{player.saldo}
                            </span>
                          </div>
                          {isSwappable && (
                            <span className="text-xs text-brand font-semibold shrink-0">Trocar ⇄</span>
                          )}
                          {isSelected && (
                            <span className="text-xs text-brand font-semibold shrink-0">Selecionado ●</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground -mt-2">
        Toque em um jogador para selecioná-lo, depois toque em outro para realizar a troca.
      </p>

      <Button
        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
        disabled={pairs.length < 2 || !suggestedPhase || generating}
        onClick={generateKnockout}
      >
        {generating ? "Gerando…" : "Confirmar e Gerar Chaveamento →"}
      </Button>
    </div>
  );
}
