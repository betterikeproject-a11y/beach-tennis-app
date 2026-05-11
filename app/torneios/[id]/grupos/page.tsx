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
import type { Group, GroupMatch, Player } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";

type GroupData = {
  group: Group;
  players: Player[];
  matches: GroupMatch[];
  standings: PlayerStanding[];
};

export default function GruposPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function loadData() {
    const [{ data: groupRows }, { data: members }, { data: allMatches }, { data: allPlayers }] = await Promise.all([
      supabase.from("groups").select("*").eq("tournament_id", id).order("group_number"),
      supabase.from("group_members").select("*"),
      supabase.from("group_matches").select("*"),
      supabase.from("players").select("*").eq("tournament_id", id),
    ]);

    if (!groupRows || !allPlayers) { setError("Erro ao carregar dados"); setLoading(false); return; }

    const built: GroupData[] = groupRows.map((group) => {
      const memberIds = (members ?? []).filter((m) => m.group_id === group.id).map((m) => m.player_id);
      const players = (allPlayers ?? []).filter((p) => memberIds.includes(p.id));
      const matches = (allMatches ?? []).filter((m) => m.group_id === group.id);
      const standings = computeGroupStandings(
        players.map((p) => ({ id: p.id, name: p.name })),
        matches
      );
      return { group, players, matches, standings };
    });

    setGroups(built);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`grupos-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_matches" }, () => {
        loadData();
      })
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
    // refresh local state
    setGroups((prev) =>
      prev.map((gd) => ({
        ...gd,
        matches: gd.matches.map((m) => {
          if (m.id !== matchId) return m;
          const updated = { ...m, score_dupla1: scoreA, score_dupla2: scoreB, status: (bothSet && valid ? "concluido" : "pendente") as GroupMatch["status"] };
          return updated;
        }),
        standings: computeGroupStandings(
          gd.players.map((p) => ({ id: p.id, name: p.name })),
          gd.matches.map((m) => {
            if (m.id !== matchId) return m;
            return { ...m, score_dupla1: scoreA, score_dupla2: scoreB };
          })
        ),
      }))
    );
  }, []);

  function handleScoreChange(matchId: string, a: number | null, b: number | null) {
    clearTimeout(debounceTimers.current[matchId]);
    // Update local state immediately for responsive feel
    setGroups((prev) =>
      prev.map((gd) => ({
        ...gd,
        matches: gd.matches.map((m) => m.id === matchId ? { ...m, score_dupla1: a, score_dupla2: b } : m),
        standings: computeGroupStandings(
          gd.players.map((p) => ({ id: p.id, name: p.name })),
          gd.matches.map((m) => m.id === matchId ? { ...m, score_dupla1: a, score_dupla2: b } : m)
        ),
      }))
    );
    debounceTimers.current[matchId] = setTimeout(() => saveScore(matchId, a, b), 500);
  }

  const allDone = groups.length > 0 && groups.every((gd) =>
    gd.matches.every((m) => m.status === "concluido")
  );

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
        {savedIndicator && (
          <span className="text-xs text-green-600 animate-pulse">✓ salvo</span>
        )}
      </div>

      {groups.map((gd) => (
        <GroupCard
          key={gd.group.id}
          gd={gd}
          savedMatchId={savedIndicator}
          onScoreChange={handleScoreChange}
        />
      ))}

      {allDone && (
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
  onScoreChange,
}: {
  gd: GroupData;
  savedMatchId: string | null;
  onScoreChange: (id: string, a: number | null, b: number | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Grupo {gd.group.group_number}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Matches */}
        <div className="space-y-3">
          {gd.matches
            .sort((a, b) => a.match_number - b.match_number)
            .map((m) => {
              const d1 = [m.dupla1_player1_id, m.dupla1_player2_id]
                .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? pid)
                .join(" / ");
              const d2 = [m.dupla2_player1_id, m.dupla2_player2_id]
                .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? pid)
                .join(" / ");
              return (
                <div key={m.id} className="rounded-lg border p-3 space-y-2 bg-white">
                  <div className="text-xs text-muted-foreground">Jogo {m.match_number}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d1}</div>
                      <div className="text-xs text-muted-foreground">×</div>
                      <div className="text-sm font-medium truncate">{d2}</div>
                    </div>
                    <div className="relative">
                      <ScoreInput
                        scoreA={m.score_dupla1}
                        scoreB={m.score_dupla2}
                        onChange={(a, b) => onScoreChange(m.id, a, b)}
                      />
                      {savedMatchId === m.id && (
                        <span className="absolute -top-1 -right-1 text-xs text-green-600">✓</span>
                      )}
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
                <th className="text-left py-1 pr-1">#</th>
                <th className="text-left py-1">Jogador</th>
                <th className="text-right py-1 px-1">V</th>
                <th className="text-right py-1 px-1">G+</th>
                <th className="text-right py-1 px-1">G-</th>
                <th className="text-right py-1 px-1">Saldo</th>
                <th className="text-right py-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {gd.standings.map((s) => (
                <tr key={s.playerId} className="border-b last:border-0">
                  <td className="py-1 pr-1 text-muted-foreground">{s.position}</td>
                  <td className="py-1 font-medium truncate max-w-[100px]">{s.playerName}</td>
                  <td className="py-1 px-1 text-center">{s.wins}</td>
                  <td className="py-1 px-1 text-center text-green-600">{s.gamesFor}</td>
                  <td className="py-1 px-1 text-center text-red-500">{s.gamesAgainst}</td>
                  <td className={`py-1 px-1 text-center ${s.saldo >= 0 ? "text-green-600" : "text-red-500"}`}>{s.saldo > 0 ? `+${s.saldo}` : s.saldo}</td>
                  <td className="py-1 text-right font-bold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
