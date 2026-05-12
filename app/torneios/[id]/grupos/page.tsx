"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { computeGroupStandings } from "@/lib/domain/standings";
import { isValidScore } from "@/lib/domain/matches";
import { ScoreInput } from "@/components/ScoreInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import type { Group, GroupMatch, GroupMember, Player } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";

const GROUP_COLORS = [
  { border: "border-t-4 border-t-blue-400", title: "text-blue-600" },
  { border: "border-t-4 border-t-emerald-400", title: "text-emerald-600" },
  { border: "border-t-4 border-t-orange-400", title: "text-orange-600" },
  { border: "border-t-4 border-t-purple-400", title: "text-purple-600" },
  { border: "border-t-4 border-t-rose-400", title: "text-rose-600" },
  { border: "border-t-4 border-t-amber-400", title: "text-amber-600" },
  { border: "border-t-4 border-t-cyan-400", title: "text-cyan-600" },
  { border: "border-t-4 border-t-indigo-400", title: "text-indigo-600" },
] as const;

type GroupData = {
  group: Group;
  players: Player[];
  matches: GroupMatch[];
  standings: PlayerStanding[];
  members: GroupMember[];
  overrides: Record<string, number | null>;
};

function isTied(a: PlayerStanding, b: PlayerStanding): boolean {
  return a.points === b.points && a.saldo === b.saldo && a.gamesFor === b.gamesFor;
}

export default function GruposPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { isAdmin } = useAuth();

  async function loadData() {
    const [{ data: groupRows }, { data: members }, { data: allMatches }, { data: allPlayers }] = await Promise.all([
      supabase.from("groups").select("*").eq("tournament_id", id).order("group_number"),
      supabase.from("group_members").select("*"),
      supabase.from("group_matches").select("*"),
      supabase.from("players").select("*").eq("tournament_id", id),
    ]);

    if (!groupRows || !allPlayers) { setError("Erro ao carregar dados"); setLoading(false); return; }

    const built: GroupData[] = groupRows.map((group) => {
      const groupMembers = (members ?? []).filter((m) => m.group_id === group.id);
      const memberIds = groupMembers.map((m) => m.player_id);
      const players = (allPlayers ?? []).filter((p) => memberIds.includes(p.id));
      const matches = (allMatches ?? []).filter((m) => m.group_id === group.id);
      const overrides: Record<string, number | null> = {};
      for (const gm of groupMembers) {
        overrides[gm.player_id] = gm.position_override;
      }
      const standings = computeGroupStandings(
        players.map((p) => ({ id: p.id, name: p.name })),
        matches,
        overrides
      );
      return { group, players, matches, standings, members: groupMembers, overrides };
    });

    setGroups(built);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    const channel = supabase
      .channel(`grupos-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_matches" }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const saveScore = useCallback(async (matchId: string, scoreA: number | null, scoreB: number | null) => {
    const bothSet = scoreA !== null && scoreB !== null;
    const valid = bothSet ? isValidScore(scoreA!, scoreB!) : true;
    if (!valid) return;

    const { error } = await supabase
      .from("group_matches")
      .update({
        score_dupla1: scoreA,
        score_dupla2: scoreB,
        status: bothSet && valid ? "concluido" : "pendente",
      })
      .eq("id", matchId);

    if (error) { toast.error("Erro ao salvar placar"); return; }
    setSavedIndicator(matchId);
    setTimeout(() => setSavedIndicator(null), 1500);
    setGroups((prev) =>
      prev.map((gd) => {
        const updatedMatches = gd.matches.map((m) => {
          if (m.id !== matchId) return m;
          return { ...m, score_dupla1: scoreA, score_dupla2: scoreB, status: (bothSet && valid ? "concluido" : "pendente") as GroupMatch["status"] };
        });
        return {
          ...gd,
          matches: updatedMatches,
          standings: computeGroupStandings(
            gd.players.map((p) => ({ id: p.id, name: p.name })),
            updatedMatches,
            gd.overrides
          ),
        };
      })
    );
  }, []);

  function handleScoreChange(matchId: string, a: number | null, b: number | null) {
    clearTimeout(debounceTimers.current[matchId]);
    setGroups((prev) =>
      prev.map((gd) => {
        const updatedMatches = gd.matches.map((m) => m.id === matchId ? { ...m, score_dupla1: a, score_dupla2: b } : m);
        return {
          ...gd,
          matches: updatedMatches,
          standings: computeGroupStandings(
            gd.players.map((p) => ({ id: p.id, name: p.name })),
            updatedMatches,
            gd.overrides
          ),
        };
      })
    );
    debounceTimers.current[matchId] = setTimeout(() => saveScore(matchId, a, b), 500);
  }

  async function handleSwapTiebreaker(groupId: string, p1: PlayerStanding, p2: PlayerStanding) {
    const gd = groups.find((g) => g.group.id === groupId);
    if (!gd) return;
    const m1 = gd.members.find((m) => m.player_id === p1.playerId);
    const m2 = gd.members.find((m) => m.player_id === p2.playerId);
    if (!m1 || !m2) return;

    const o1 = m1.position_override ?? p1.position;
    const o2 = m2.position_override ?? p2.position;

    await Promise.all([
      supabase.from("group_members").update({ position_override: o2 }).eq("id", m1.id),
      supabase.from("group_members").update({ position_override: o1 }).eq("id", m2.id),
    ]);
    loadData();
  }

  const allDone = groups.length > 0 && groups.every((gd) => gd.matches.every((m) => m.status === "concluido"));

  async function advanceToKnockout() {
    await supabase.from("tournaments").update({ status: "eliminatorias" }).eq("id", id);
    router.push(`/torneios/${id}/classificacao`);
  }

  if (error) return <div className="text-red-500 p-4">{error}</div>;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fase de Grupos</h1>
        {savedIndicator && <span className="text-xs text-green-600 animate-pulse">✓ salvo</span>}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
        {groups.map((gd) => {
          const color = GROUP_COLORS[(gd.group.group_number - 1) % GROUP_COLORS.length];
          return (
            <GroupCard
              key={gd.group.id}
              gd={gd}
              savedMatchId={savedIndicator}
              colorClasses={color}
              onScoreChange={handleScoreChange}
              onSwapTiebreaker={(p1, p2) => handleSwapTiebreaker(gd.group.id, p1, p2)}
            />
          );
        })}
      </div>

      {isAdmin && allDone && (
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
          onClick={advanceToKnockout}
        >
          Avançar para Eliminatórias →
        </Button>
      )}
    </div>
  );
}

function GroupCard({
  gd,
  savedMatchId,
  colorClasses,
  onScoreChange,
  onSwapTiebreaker,
}: {
  gd: GroupData;
  savedMatchId: string | null;
  colorClasses: { border: string; title: string };
  onScoreChange: (id: string, a: number | null, b: number | null) => void;
  onSwapTiebreaker: (p1: PlayerStanding, p2: PlayerStanding) => void;
}) {
  const { isAdmin } = useAuth();
  const hasTies = gd.standings.some((s, i) => i < gd.standings.length - 1 && isTied(s, gd.standings[i + 1]));

  return (
    <Card className={colorClasses.border}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${colorClasses.title}`}>Grupo {gd.group.group_number}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Matches */}
        <div className="space-y-3">
          {gd.matches
            .slice()
            .sort((a, b) => a.match_number - b.match_number)
            .map((m) => {
              const d1 = [m.dupla1_player1_id, m.dupla1_player2_id]
                .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? pid)
                .join(" / ");
              const d2 = [m.dupla2_player1_id, m.dupla2_player2_id]
                .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? pid)
                .join(" / ");
              return (
                <div key={m.id} className="rounded-lg border p-3 space-y-3 bg-white relative">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">Jogo {m.match_number}</div>
                    {savedMatchId === m.id && (
                      <span className="text-xs text-green-600 font-bold">✓ Salvo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium leading-tight">{d1}</div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={7}
                        value={m.score_dupla1 ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                          if (v !== null && (v < 0 || v > 7)) return;
                          onScoreChange(m.id, v, m.score_dupla2);
                        }}
                        disabled={!isAdmin}
                        className="w-12 h-10 text-center text-base font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white disabled:bg-gray-50 shrink-0"
                        placeholder="–"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium leading-tight">{d2}</div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={7}
                        value={m.score_dupla2 ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                          if (v !== null && (v < 0 || v > 7)) return;
                          onScoreChange(m.id, m.score_dupla1, v);
                        }}
                        disabled={!isAdmin}
                        className="w-12 h-10 text-center text-base font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white disabled:bg-gray-50 shrink-0"
                        placeholder="–"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Standings */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Classificação</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1 pr-1 w-5">#</th>
                <th className="text-left py-1">Jogador</th>
                <th className="text-right py-1 px-1 w-6">V</th>
                <th className="text-right py-1 px-1 w-7">G+</th>
                <th className="text-right py-1 px-1 w-7">G-</th>
                <th className="text-right py-1 px-1 w-10">Saldo</th>
                <th className="text-right py-1 w-7">Pts</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {gd.standings.map((s, idx) => {
                const above = idx > 0 ? gd.standings[idx - 1] : null;
                const below = idx < gd.standings.length - 1 ? gd.standings[idx + 1] : null;
                const tiedAbove = above != null && isTied(s, above);
                const tiedBelow = below != null && isTied(s, below);
                const isManual = gd.overrides[s.playerId] != null;
                return (
                  <tr key={s.playerId} className="border-b last:border-0">
                    <td className="py-1 pr-1 text-muted-foreground font-mono font-medium">{s.position}</td>
                    <td className="py-1 font-medium truncate max-w-[90px]">
                      {s.playerName}
                      {isManual && <span className="ml-0.5 text-[9px] text-amber-500" title="Posição definida manualmente">✎</span>}
                    </td>
                    <td className="py-1 px-1 text-center">{s.wins}</td>
                    <td className="py-1 px-1 text-center text-green-600">{s.gamesFor}</td>
                    <td className="py-1 px-1 text-center text-red-500">{s.gamesAgainst}</td>
                    <td className={`py-1 px-1 text-center ${s.saldo >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                    </td>
                    <td className="py-1 text-right font-bold">{s.points}</td>
                    <td className="py-1 pl-1 text-center">
                      {isAdmin && (tiedAbove || tiedBelow) && (
                        <div className="flex flex-col items-center gap-0">
                          {tiedAbove && (
                            <button
                              onClick={() => onSwapTiebreaker(s, above!)}
                              className="text-amber-500 hover:text-amber-700 text-sm leading-none font-bold"
                              title="Mover para cima (desempate manual)"
                            >↑</button>
                          )}
                          {tiedBelow && (
                            <button
                              onClick={() => onSwapTiebreaker(s, below!)}
                              className="text-amber-500 hover:text-amber-700 text-sm leading-none font-bold"
                              title="Mover para baixo (desempate manual)"
                            >↓</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isAdmin && hasTies && (
            <p className="text-[10px] text-amber-600 mt-1.5">
              Empate detectado — use ↑↓ para definir a colocação manualmente.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
