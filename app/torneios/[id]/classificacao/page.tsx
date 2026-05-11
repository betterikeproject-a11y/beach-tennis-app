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

type RichPlayer = PlayerStanding & { groupNumber: number };
type PairEntry = { p1: RichPlayer; p2: RichPlayer };

function ordinal(n: number) { return `${n}º`; }

export default function ClassificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [allOverall, setAllOverall] = useState<RichPlayer[]>([]);
  const [numClassifica, setNumClassifica] = useState(3);
  const [pairs, setPairs] = useState<PairEntry[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ pairIdx: number; slot: 0 | 1 } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => {
    if (allOverall.length === 0) return;

    const byGroup: Record<number, RichPlayer[]> = {};
    for (const s of allOverall) {
      byGroup[s.groupNumber] = byGroup[s.groupNumber] ?? [];
      byGroup[s.groupNumber].push(s);
    }

    const sortFn = (a: RichPlayer, b: RichPlayer) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.saldo !== a.saldo) return b.saldo - a.saldo;
      if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
      return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
    };

    const classifiedOverall = computeOverallStandings(
      Object.keys(byGroup).map((gn) =>
        byGroup[Number(gn)].slice().sort(sortFn).slice(0, numClassifica)
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
    setEditingSlot(null);
  }, [allOverall, numClassifica]);

  // All classified players flat list (for checking if in pair)
  const allClassified: (RichPlayer & { pairIdx: number; slot: 0 | 1 })[] = pairs.flatMap((pair, pi) => [
    { ...pair.p1, pairIdx: pi, slot: 0 as const },
    { ...pair.p2, pairIdx: pi, slot: 1 as const },
  ]);

  function swapSlot(targetPairIdx: number, targetSlot: 0 | 1, newPlayerId: string) {
    setPairs((prev) => {
      const next = prev.map((p) => ({ p1: { ...p.p1 }, p2: { ...p.p2 } }));
      // Find where newPlayer currently lives
      let srcPairIdx = -1, srcSlot: 0 | 1 = 0;
      for (let pi = 0; pi < next.length; pi++) {
        if (next[pi].p1.playerId === newPlayerId) { srcPairIdx = pi; srcSlot = 0; break; }
        if (next[pi].p2.playerId === newPlayerId) { srcPairIdx = pi; srcSlot = 1; break; }
      }
      
      if (srcPairIdx !== -1) {
        const displaced = targetSlot === 0 ? next[targetPairIdx].p1 : next[targetPairIdx].p2;
        const incoming = srcSlot === 0 ? next[srcPairIdx].p1 : next[srcPairIdx].p2;

        if (targetSlot === 0) next[targetPairIdx].p1 = incoming;
        else next[targetPairIdx].p2 = incoming;

        if (srcSlot === 0) next[srcPairIdx].p1 = displaced;
        else next[srcPairIdx].p2 = displaced;
      } else {
        const incoming = allOverall.find(p => p.playerId === newPlayerId);
        if (!incoming) return prev;
        if (targetSlot === 0) next[targetPairIdx].p1 = incoming;
        else next[targetPairIdx].p2 = incoming;
      }

      return next;
    });
    setEditingSlot(null);
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
        .from("knockout_pairs").insert(pairRows).select("id, seed");
      if (pe || !insertedPairs) throw pe ?? new Error("Falha ao inserir duplas");

      const bracket = generateBracket(insertedPairs.map((p: { id: string; seed: number }) => ({ id: p.id, seed: p.seed })));
      const { error: me } = await supabase.from("knockout_matches").insert(
        bracket.map((m) => ({
          tournament_id: id,
          phase: m.phase,
          bracket_position: m.bracketPosition,
          pair_a_id: m.pairAId,
          pair_b_id: m.pairBId,
        }))
      );
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
              type="number" min={1} max={5} value={numClassifica}
              onChange={(e) => setNumClassifica(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              className="w-14 border rounded px-2 py-1 text-center text-sm"
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {pairs.length} dupla{pairs.length !== 1 ? "s" : ""} →{" "}
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
                  <tr key={s.playerId} className={`border-b last:border-0 ${isClassified ? "bg-brand-light" : ""}`}>
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
        <h2 className="font-semibold text-base">Duplas para o Chaveamento</h2>
        <p className="text-xs text-muted-foreground -mt-1">
          Clique em "Trocar" ao lado de qualquer jogador para substituí-lo por outro classificado.
        </p>

        {pairs.map((pair, i) => {
          const slots = [
            { player: pair.p1, slot: 0 as const },
            { player: pair.p2, slot: 1 as const },
          ];
          return (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex">
                  {/* Pair number badge */}
                  <div className="bg-brand text-white flex flex-col items-center justify-center px-3 min-w-[64px] self-stretch">
                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-wide">Dupla</span>
                    <span className="text-2xl font-bold leading-none">#{i + 1}</span>
                  </div>

                  {/* Players */}
                  <div className="flex-1 divide-y">
                    {slots.map(({ player, slot }) => {
                      const isEditing = editingSlot?.pairIdx === i && editingSlot?.slot === slot;
                      return (
                        <div key={player.playerId} className="px-4 py-2.5 flex items-center gap-3">
                          {isEditing ? (
                            /* Swap dropdown */
                            <div className="flex-1 flex items-center gap-2">
                              <select
                                autoFocus
                                className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                                defaultValue={player.playerId}
                                onChange={(e) => swapSlot(i, slot, e.target.value)}
                              >
                                <option value="" disabled>Selecione um jogador…</option>
                                {allOverall.map((cp) => {
                                  const inPair = pairs.findIndex(p => p.p1.playerId === cp.playerId || p.p2.playerId === cp.playerId);
                                  return (
                                    <option key={cp.playerId} value={cp.playerId}>
                                      {cp.playerName} — {ordinal(cp.position)} geral · Gr.{cp.groupNumber} · {cp.wins}V · saldo {cp.saldo >= 0 ? "+" : ""}{cp.saldo}
                                      {inPair === i ? " (dupla atual)" : inPair !== -1 ? ` (Dupla #${inPair + 1})` : " (Não classificado)"}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                onClick={() => setEditingSlot(null)}
                                className="text-xs text-muted-foreground hover:text-red-500 px-2 py-1 border rounded-md"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            /* Normal display */
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold">{player.playerName}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {ordinal(player.position)} geral · Gr.{player.groupNumber} · {player.wins}V · saldo {player.saldo >= 0 ? "+" : ""}{player.saldo}
                                </span>
                              </div>
                              <button
                                onClick={() => setEditingSlot({ pairIdx: i, slot })}
                                className="shrink-0 text-xs text-brand hover:text-brand-hover font-medium border border-brand/30 rounded px-2 py-0.5 hover:bg-brand-light transition-colors"
                              >
                                Trocar
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
