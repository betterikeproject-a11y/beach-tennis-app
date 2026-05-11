"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { drawGroups, computeGroupSizes } from "@/lib/domain/draw";
import { generateGroupMatches } from "@/lib/domain/matches";
import { toast } from "sonner";
import type { Player } from "@/lib/types/database";
import type { GroupDraw, DrawPlayer } from "@/lib/domain/draw";

type Mode = "auto" | "manual";

const GROUP_COLORS = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-purple-50 border-purple-200",
  "bg-orange-50 border-orange-200",
  "bg-pink-50 border-pink-200",
  "bg-teal-50 border-teal-200",
  "bg-yellow-50 border-yellow-200",
  "bg-red-50 border-red-200",
];

export default function SorteioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const [mode, setMode] = useState<Mode>("auto");
  const [usarCabecas, setUsarCabecas] = useState(false);
  const [selectedSeeds, setSelectedSeeds] = useState<Set<string>>(new Set());

  // Auto draw state
  const [draw, setDraw] = useState<GroupDraw | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  // Manual groups: array of player IDs per group
  const [manualGroups, setManualGroups] = useState<string[][]>([]);

  useEffect(() => {
    supabase
      .from("players")
      .select("*")
      .eq("tournament_id", id)
      .then(({ data }) => {
        const p = data ?? [];
        setPlayers(p);
        setSelectedSeeds(new Set(p.filter((pl) => pl.is_cabeca_de_chave).map((pl) => pl.id)));
        setLoading(false);
      });
  }, [id]);

  // Compute group sizes
  let groupSizes: number[] = [];
  let groupSizeError: string | null = null;
  try {
    groupSizes = players.length > 0 ? computeGroupSizes(players.length) : [];
  } catch (e) {
    groupSizeError = e instanceof Error ? e.message : String(e);
  }
  const numGroups = groupSizes.length;

  function switchMode(m: Mode) {
    setMode(m);
    setDraw(null);
    setDrawError(null);
    if (m === "manual") {
      setManualGroups(Array.from({ length: numGroups }, () => []));
    }
  }

  function toggleSeed(playerId: string) {
    setSelectedSeeds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
    setDraw(null);
  }

  // Auto draw
  function runDraw() {
    setDrawError(null);
    try {
      const mapped = players.map((p) => ({
        id: p.id,
        name: p.name,
        isCabecaDeChave: usarCabecas && selectedSeeds.has(p.id),
      }));
      setDraw(drawGroups(mapped, usarCabecas && selectedSeeds.size === numGroups));
    } catch (e: unknown) {
      setDrawError(e instanceof Error ? e.message : String(e));
    }
  }

  // Manual group management
  const unassigned = players.filter((p) => !manualGroups.some((g) => g.includes(p.id)));

  function assignToGroup(playerId: string, groupIdx: number) {
    setManualGroups((prev) => {
      const next = prev.map((g) => g.filter((pid) => pid !== playerId));
      next[groupIdx] = [...next[groupIdx], playerId];
      return next;
    });
  }

  function removeFromGroup(playerId: string, groupIdx: number) {
    setManualGroups((prev) => {
      const next = [...prev];
      next[groupIdx] = next[groupIdx].filter((pid) => pid !== playerId);
      return next;
    });
  }

  const manualComplete =
    manualGroups.length === numGroups &&
    manualGroups.every((g, i) => g.length === groupSizes[i]) &&
    unassigned.length === 0;

  async function confirmGroups(finalDraw: GroupDraw) {
    setConfirming(true);
    try {
      // Persist seed selections
      if (usarCabecas) {
        await Promise.all(
          players.map((p) =>
            supabase
              .from("players")
              .update({ is_cabeca_de_chave: selectedSeeds.has(p.id) })
              .eq("id", p.id)
          )
        );
      }

      // Clear existing groups (cascade removes members + matches)
      await supabase.from("groups").delete().eq("tournament_id", id);

      // Insert groups, members, matches
      for (const g of finalDraw) {
        const { data: group, error: ge } = await supabase
          .from("groups")
          .insert({ tournament_id: id, group_number: g.groupNumber })
          .select("id")
          .single();
        if (ge || !group) throw ge ?? new Error("Falha ao criar grupo");

        await supabase.from("group_members").insert(
          g.players.map((p) => ({ group_id: group.id, player_id: p.id }))
        );

        const matchRows = generateGroupMatches(g.players.map((p) => p.id), group.id);
        await supabase.from("group_matches").insert(matchRows);
      }

      await supabase
        .from("tournaments")
        .update({ status: "grupos", usar_cabecas_de_chave: usarCabecas })
        .eq("id", id);

      toast.success("Grupos confirmados!");
      router.push(`/torneios/${id}/grupos`);
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      setConfirming(false);
    }
  }

  function handleConfirmAuto() {
    if (draw) confirmGroups(draw);
  }

  function handleConfirmManual() {
    const finalDraw: GroupDraw = manualGroups.map((ids, i) => ({
      groupNumber: i + 1,
      players: ids.map((pid) => {
        const p = players.find((pl) => pl.id === pid)!;
        return { id: p.id, name: p.name, isCabecaDeChave: usarCabecas && selectedSeeds.has(p.id) } as DrawPlayer;
      }),
    }));
    confirmGroups(finalDraw);
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando jogadores…</div>;

  if (groupSizeError) return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{groupSizeError}</div>
  );

  const seedsReady = !usarCabecas || selectedSeeds.size === numGroups;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sorteio de Grupos</h1>

      {/* Config */}
      <Card>
        <CardContent className="pt-4 space-y-5">
          <p className="text-sm text-muted-foreground">
            {players.length} jogadores · {numGroups} grupo{numGroups !== 1 ? "s" : ""} ·{" "}
            {[...new Set(groupSizes)].join(" ou ")} por grupo
          </p>

          {/* Mode toggle */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Modo</p>
            <div className="flex gap-2">
              {(["auto", "manual"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    mode === m
                      ? "bg-brand text-white border-brand"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m === "auto" ? "Sortear automaticamente" : "Montar manualmente"}
                </button>
              ))}
            </div>
          </div>

          {/* Seeds toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usarCabecas}
              onChange={(e) => { setUsarCabecas(e.target.checked); setDraw(null); }}
              className="w-4 h-4 accent-brand"
            />
            <span className="text-sm">Usar cabeças de chave</span>
          </label>

          {/* Seeds picker */}
          {usarCabecas && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Selecione exatamente {numGroups} cabeça{numGroups !== 1 ? "s" : ""} de chave — um por grupo.{" "}
                <span className={selectedSeeds.size === numGroups ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                  {selectedSeeds.size}/{numGroups} selecionados
                </span>
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {players.map((p) => {
                  const isSelected = selectedSeeds.has(p.id);
                  const isDisabled = !isSelected && selectedSeeds.size >= numGroups;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isDisabled && toggleSeed(p.id)}
                      disabled={isDisabled}
                      className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                        isSelected
                          ? "bg-yellow-100 border-yellow-400 font-medium"
                          : isDisabled
                          ? "opacity-40 border-border cursor-not-allowed"
                          : "border-border hover:bg-muted cursor-pointer"
                      }`}
                    >
                      {isSelected && <span className="text-yellow-500 mr-1">★</span>}
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto mode */}
      {mode === "auto" && (
        <>
          {drawError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {drawError}
            </div>
          )}

          <Button
            className="w-full bg-brand hover:bg-brand-hover text-white"
            onClick={runDraw}
            disabled={!seedsReady}
          >
            {draw ? "Sortear Novamente" : "Sortear Grupos"}
          </Button>

          {!seedsReady && (
            <p className="text-xs text-center text-muted-foreground -mt-4">
              Selecione {numGroups} cabeças de chave para continuar
            </p>
          )}

          {draw && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {draw.map((g, gi) => (
                  <Card key={g.groupNumber} className={`border-2 ${GROUP_COLORS[gi % GROUP_COLORS.length]}`}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-semibold">Grupo {g.groupNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <ul className="space-y-1">
                        {g.players.map((p) => (
                          <li key={p.id} className="text-sm flex items-center gap-1">
                            {p.isCabecaDeChave && <span className="text-yellow-500 text-xs">★</span>}
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                onClick={handleConfirmAuto}
                disabled={confirming}
              >
                {confirming ? "Salvando…" : "Confirmar e Avançar para Jogos →"}
              </Button>
            </>
          )}
        </>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <>
          {/* Unassigned pool */}
          {unassigned.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Não alocados ({unassigned.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {unassigned.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-sm flex-1">
                      {usarCabecas && selectedSeeds.has(p.id) && (
                        <span className="text-yellow-500 mr-1">★</span>
                      )}
                      {p.name}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {manualGroups.map((g, gi) => {
                        const full = g.length >= groupSizes[gi];
                        return (
                          <button
                            key={gi}
                            onClick={() => !full && assignToGroup(p.id, gi)}
                            disabled={full}
                            className={`text-xs px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                              full
                                ? "opacity-30 bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-brand-light hover:bg-brand/20 text-brand-hover cursor-pointer"
                            }`}
                          >
                            G{gi + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Groups */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {manualGroups.map((groupIds, gi) => (
              <Card key={gi} className={`border-2 ${GROUP_COLORS[gi % GROUP_COLORS.length]}`}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold flex justify-between items-center">
                    <span>Grupo {gi + 1}</span>
                    <span className={`text-xs font-normal ${groupIds.length === groupSizes[gi] ? "text-green-600" : "text-muted-foreground"}`}>
                      {groupIds.length}/{groupSizes[gi]}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 min-h-[2.5rem]">
                  {groupIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum jogador alocado</p>
                  ) : (
                    <ul className="space-y-1">
                      {groupIds.map((pid) => {
                        const p = players.find((pl) => pl.id === pid)!;
                        return (
                          <li key={pid} className="text-sm flex items-center justify-between">
                            <span>
                              {usarCabecas && selectedSeeds.has(pid) && (
                                <span className="text-yellow-500 mr-1">★</span>
                              )}
                              {p.name}
                            </span>
                            <button
                              onClick={() => removeFromGroup(pid, gi)}
                              className="text-xs text-muted-foreground hover:text-red-500 px-1 transition-colors"
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
            onClick={handleConfirmManual}
            disabled={!manualComplete || confirming}
          >
            {confirming
              ? "Salvando…"
              : !manualComplete
              ? `Aloque todos os ${players.length} jogadores para confirmar`
              : "Confirmar e Avançar para Jogos →"}
          </Button>
        </>
      )}
    </div>
  );
}
