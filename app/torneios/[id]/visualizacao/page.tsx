"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { computeGroupStandings, computeOverallStandings } from "@/lib/domain/standings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Group, GroupMatch, GroupMember, Player, KnockoutMatch, KnockoutPair, Tournament } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";

const GROUP_COLORS = [
  { border: "border-t-4 border-t-blue-400", title: "text-blue-600", bg: "bg-blue-50" },
  { border: "border-t-4 border-t-emerald-400", title: "text-emerald-600", bg: "bg-emerald-50" },
  { border: "border-t-4 border-t-orange-400", title: "text-orange-600", bg: "bg-orange-50" },
  { border: "border-t-4 border-t-purple-400", title: "text-purple-600", bg: "bg-purple-50" },
  { border: "border-t-4 border-t-rose-400", title: "text-rose-600", bg: "bg-rose-50" },
  { border: "border-t-4 border-t-amber-400", title: "text-amber-600", bg: "bg-amber-50" },
  { border: "border-t-4 border-t-cyan-400", title: "text-cyan-600", bg: "bg-cyan-50" },
  { border: "border-t-4 border-t-indigo-400", title: "text-indigo-600", bg: "bg-indigo-50" },
] as const;

const PHASE_LABEL: Record<string, string> = {
  quartas: "Quartas de Final",
  semis: "Semifinais",
  final: "Final",
  terceiro: "Disputa do 3º Lugar",
};

type GroupData = {
  group: Group;
  players: Player[];
  matches: GroupMatch[];
  standings: PlayerStanding[];
};

type KnockoutData = {
  matches: KnockoutMatch[];
  pairs: KnockoutPair[];
  players: Player[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  grupos: "Fase de Grupos",
  eliminatorias: "Eliminatórias",
  finalizado: "Finalizado",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  grupos: "bg-blue-100 text-blue-700",
  eliminatorias: "bg-brand-light text-brand-hover",
  finalizado: "bg-green-100 text-green-700",
};

export default function VisualizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [knockout, setKnockout] = useState<KnockoutData | null>(null);
  const [allOverall, setAllOverall] = useState<(PlayerStanding & { groupNumber: number, position: number })[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [
      { data: t },
      { data: groupRows },
      { data: members },
      { data: allMatches },
      { data: allPlayers },
      { data: knockoutMatches },
      { data: knockoutPairs },
    ] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).single(),
      supabase.from("groups").select("*").eq("tournament_id", id).order("group_number"),
      supabase.from("group_members").select("*"),
      supabase.from("group_matches").select("*"),
      supabase.from("players").select("*").eq("tournament_id", id),
      supabase.from("knockout_matches").select("*").eq("tournament_id", id).order("bracket_position"),
      supabase.from("knockout_pairs").select("*").eq("tournament_id", id).order("seed"),
    ]);

    if (t) setTournament(t as Tournament);

    const built: GroupData[] = (groupRows ?? []).map((group) => {
      const groupMembers = (members ?? []).filter((m: GroupMember) => m.group_id === group.id);
      const memberIds = groupMembers.map((m: GroupMember) => m.player_id);
      const players = (allPlayers ?? []).filter((p: Player) => memberIds.includes(p.id));
      const matches = (allMatches ?? []).filter((m: GroupMatch) => m.group_id === group.id);
      const overrides: Record<string, number | null> = {};
      for (const gm of groupMembers) overrides[gm.player_id] = gm.position_override;
      const standings = computeGroupStandings(
        players.map((p: Player) => ({ id: p.id, name: p.name })),
        matches,
        overrides
      );
      return { group, players, matches, standings };
    });
    setGroups(built);

    const allGroupStandings = built.flatMap(gd => gd.standings.map(s => ({ ...s, groupNumber: gd.group.group_number })));
    const overall = computeOverallStandings(allGroupStandings).map((s, i) => ({
      ...s,
      groupNumber: allGroupStandings.find(gs => gs.playerId === s.playerId)?.groupNumber ?? 0,
      position: i + 1,
    }));
    setAllOverall(overall);

    if ((knockoutMatches ?? []).length > 0) {
      setKnockout({
        matches: knockoutMatches ?? [],
        pairs: knockoutPairs ?? [],
        players: allPlayers ?? [],
      });
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    const ch = supabase
      .channel(`visualizacao-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_matches" }, loadData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "knockout_matches" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm animate-pulse">
        Carregando…
      </div>
    );
  }

  function pairName(pairId: string | null): string {
    if (!pairId || !knockout) return "A definir";
    const pair = knockout.pairs.find((p) => p.id === pairId);
    if (!pair) return "A definir";
    const p1 = knockout.players.find((p) => p.id === pair.player1_id)?.name ?? "?";
    const p2 = knockout.players.find((p) => p.id === pair.player2_id)?.name ?? "?";
    return `${p1} / ${p2}`;
  }

  const finalMatch = knockout?.matches.find((m) => m.phase === "final");
  const champion = finalMatch?.winner_pair_id ? pairName(finalMatch.winner_pair_id) : null;
  const vice = finalMatch?.winner_pair_id
    ? pairName(finalMatch.winner_pair_id === finalMatch.pair_a_id ? finalMatch.pair_b_id : finalMatch.pair_a_id)
    : null;

  const phases = ["quartas", "semis", "final", "terceiro"];
  const presentPhases = phases.filter((ph) => knockout?.matches.some((m) => m.phase === ph));

  return (
    /* Full-bleed breakout from parent max-w-2xl */
    <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}>
      <div className="max-w-5xl mx-auto px-4 py-2 space-y-6">

        {/* Tournament header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">{tournament?.name}</h1>
            {tournament?.date && (
              <p className="text-sm text-muted-foreground">
                {new Date(tournament.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
          </div>
          {tournament && (
            <Badge className={STATUS_COLOR[tournament.status]}>
              {STATUS_LABEL[tournament.status]}
            </Badge>
          )}
        </div>

        {/* Champion banner */}
        {champion && (
          <div className="rounded-xl bg-brand-light border border-brand/30 p-5 text-center space-y-2">
            <p className="text-4xl">🏆</p>
            <p className="font-bold text-xl text-brand">Campeão: {champion}</p>
            <p className="text-base font-medium text-muted-foreground">Vice: {vice}</p>
          </div>
        )}

        {/* Groups grid */}
        {groups.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Fase de Grupos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
              {groups.map((gd) => {
                const color = GROUP_COLORS[(gd.group.group_number - 1) % GROUP_COLORS.length];
                return (
                  <Card key={gd.group.id} className={color.border}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className={`text-sm font-bold ${color.title}`}>
                        Grupo {gd.group.group_number}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-4">
                      {/* Matches */}
                      <div className="space-y-2">
                        {gd.matches
                          .slice()
                          .sort((a, b) => a.match_number - b.match_number)
                          .map((m) => {
                            const d1 = [m.dupla1_player1_id, m.dupla1_player2_id]
                              .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? "?")
                              .join(" / ");
                            const d2 = [m.dupla2_player1_id, m.dupla2_player2_id]
                              .map((pid) => gd.players.find((p) => p.id === pid)?.name ?? "?")
                              .join(" / ");
                            const done = m.status === "concluido";
                            const d1Won = done && (m.score_dupla1 ?? 0) > (m.score_dupla2 ?? 0);
                            const d2Won = done && (m.score_dupla2 ?? 0) > (m.score_dupla1 ?? 0);
                            return (
                              <div key={m.id} className={`rounded-lg border px-3 py-2 text-xs ${done ? color.bg : "bg-white"}`}>
                                <div className="text-[10px] text-muted-foreground mb-1">Jogo {m.match_number}</div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`truncate flex-1 font-medium ${d1Won ? "text-green-700 font-bold" : ""}`}>{d1}</span>
                                  {done && <span className="font-bold tabular-nums shrink-0">{m.score_dupla1}</span>}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`truncate flex-1 font-medium ${d2Won ? "text-green-700 font-bold" : ""}`}>{d2}</span>
                                  {done && <span className="font-bold tabular-nums shrink-0">{m.score_dupla2}</span>}
                                </div>
                                {!done && <p className="text-[10px] text-muted-foreground italic mt-1">Pendente</p>}
                              </div>
                            );
                          })}
                      </div>

                      {/* Standings */}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Classificação</p>
                        <table className="w-full text-xs">
                          <tbody>
                            {gd.standings.map((s) => (
                              <tr key={s.playerId} className="border-b last:border-0">
                                <td className="py-0.5 pr-1 text-muted-foreground font-mono w-4">{s.position}</td>
                                <td className="py-0.5 font-medium truncate max-w-[80px]">{s.playerName}</td>
                                <td className="py-0.5 px-1 text-center text-muted-foreground w-5">{s.wins}V</td>
                                <td className={`py-0.5 text-right font-bold w-8 ${s.saldo >= 0 ? "text-green-700" : "text-red-500"}`}>
                                  {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                                </td>
                                <td className="py-0.5 pl-1 text-right font-bold w-6">{s.points}p</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Classificação Geral & Duplas Formadas */}
        {allOverall.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Classificação Geral</h2>
            <Card>
              <CardContent className="px-3 py-3 overflow-x-auto">
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
                    </tr>
                  </thead>
                  <tbody>
                    {allOverall.map((s) => {
                      const color = GROUP_COLORS[(s.groupNumber - 1) % GROUP_COLORS.length];
                      return (
                        <tr key={s.playerId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-1.5 pr-1 text-muted-foreground font-mono font-semibold">{s.position}</td>
                          <td className="py-1.5 font-medium max-w-[120px] truncate">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${color?.bg.replace('bg-', 'bg-').replace('50', '400') || 'bg-gray-400'}`}></span>
                            {s.playerName}
                          </td>
                          <td className="py-1.5 px-1 text-center font-semibold">{s.groupNumber}</td>
                          <td className="py-1.5 px-1 text-center">{s.wins}</td>
                          <td className="py-1.5 px-1 text-center text-green-700">{s.gamesFor}</td>
                          <td className="py-1.5 px-1 text-center text-red-500">{s.gamesAgainst}</td>
                          <td className={`py-1.5 px-1 text-center font-medium ${s.saldo >= 0 ? "text-green-700" : "text-red-500"}`}>
                            {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                          </td>
                          <td className="py-1.5 pl-1 text-right font-bold">{s.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {knockout && knockout.pairs.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Duplas Formadas</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
                  {knockout.pairs.map((pair, idx) => {
                    const p1 = allOverall.find(p => p.playerId === pair.player1_id);
                    const p2 = allOverall.find(p => p.playerId === pair.player2_id);
                    const c1 = p1 ? GROUP_COLORS[(p1.groupNumber - 1) % GROUP_COLORS.length] : null;
                    const c2 = p2 ? GROUP_COLORS[(p2.groupNumber - 1) % GROUP_COLORS.length] : null;
                    
                    return (
                      <Card key={pair.id} className="overflow-hidden">
                        <div className="flex">
                          <div className="bg-brand text-white flex flex-col items-center justify-center px-3 py-2 min-w-[56px]">
                            <span className="text-[9px] font-medium opacity-80 uppercase tracking-wide">Dupla</span>
                            <span className="text-xl font-bold leading-none">#{idx + 1}</span>
                          </div>
                          <div className="flex-1 divide-y">
                            <div className={`px-3 py-1.5 text-sm font-medium flex items-center gap-2 ${c1?.bg || ''}`}>
                              <span className={`inline-block w-2 h-2 rounded-full ${c1?.bg.replace('bg-', 'bg-').replace('50', '400') || 'bg-gray-400'}`}></span>
                              <span className="truncate">{p1?.playerName || "?"}</span>
                            </div>
                            <div className={`px-3 py-1.5 text-sm font-medium flex items-center gap-2 ${c2?.bg || ''}`}>
                              <span className={`inline-block w-2 h-2 rounded-full ${c2?.bg.replace('bg-', 'bg-').replace('50', '400') || 'bg-gray-400'}`}></span>
                              <span className="truncate">{p2?.playerName || "?"}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Knockout bracket */}
        {knockout && presentPhases.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Eliminatórias</h2>
            {presentPhases.map((phase) => {
              const phaseMatches = knockout.matches
                .filter((m) => m.phase === phase)
                .sort((a, b) => a.bracket_position - b.bracket_position);
              return (
                <div key={phase} className="space-y-2">
                  <h3 className="text-sm font-semibold">{PHASE_LABEL[phase]}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-start">
                    {phaseMatches.map((m) => {
                      const aWon = m.winner_pair_id === m.pair_a_id;
                      const bWon = m.winner_pair_id === m.pair_b_id;
                      const done = m.winner_pair_id != null;
                      return (
                        <Card key={m.id} className={done ? "bg-green-50 border-green-200" : ""}>
                          <CardContent className="p-3">
                            {m.pair_a_id && m.pair_b_id ? (
                              <>
                                <div className="flex justify-between items-center gap-1">
                                  <p className={`text-sm font-medium truncate flex-1 ${aWon ? "text-green-700 font-bold" : ""}`}>
                                    {pairName(m.pair_a_id)}
                                  </p>
                                  {done && <span className="font-bold text-sm tabular-nums shrink-0">{m.score_a}</span>}
                                </div>
                                <div className="flex justify-between items-center gap-1 mt-1">
                                  <p className={`text-sm font-medium truncate flex-1 ${bWon ? "text-green-700 font-bold" : ""}`}>
                                    {pairName(m.pair_b_id)}
                                  </p>
                                  {done && <span className="font-bold text-sm tabular-nums shrink-0">{m.score_b}</span>}
                                </div>
                                {!done && <p className="text-xs text-muted-foreground italic mt-1">Pendente</p>}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Aguardando…</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
