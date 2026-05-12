"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueRankingRow } from "@/lib/types/database";
import { DEFAULT_POINTS_CONFIG, type PlayerPointsRow } from "@/lib/domain/ranking";

type PlayerPointsRecord = PlayerPointsRow & { tournament_id: string };

type TournamentPodium = {
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  champion: [string, string];
  vice: [string, string];
};

export function LeagueRanking() {
  const [rows, setRows] = useState<LeagueRankingRow[]>([]);
  const [podiums, setPodiums] = useState<TournamentPodium[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PlayerPointsRecord[]>([]);
  const [tournamentsMap, setTournamentsMap] = useState<Map<string, {name: string, date: string}>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<LeagueRankingRow | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: rankingData, error: rankingErr }, { data: finishedTournaments }, { data: pointsData }] = await Promise.all([
        supabase.from("league_ranking").select("*").order("total_pts", { ascending: false }),
        supabase.from("tournaments").select("id, name, date").eq("status", "finalizado").order("date", { ascending: false }),
        supabase.from("tournament_player_points").select("*"),
      ]);

      if (rankingErr) { setError(rankingErr.message); setLoading(false); return; }
      setRows(rankingData ?? []);
      setPointsHistory(pointsData ?? []);

      const tournaments = finishedTournaments ?? [];
      if (tournaments.length === 0) { setLoading(false); return; }

      const tMap = new Map();
      for (const t of tournaments) tMap.set(t.id, { name: t.name, date: t.date });
      setTournamentsMap(tMap);

      const tIds = tournaments.map((t) => t.id);

      const [{ data: finalMatches }, { data: allPairs }, { data: allPlayers }] = await Promise.all([
        supabase.from("knockout_matches").select("tournament_id, pair_a_id, pair_b_id, winner_pair_id").in("tournament_id", tIds).eq("phase", "final").not("winner_pair_id", "is", null),
        supabase.from("knockout_pairs").select("id, tournament_id, player1_id, player2_id").in("tournament_id", tIds),
        supabase.from("players").select("id, name").in("tournament_id", tIds),
      ]);

      const pairsMap = new Map((allPairs ?? []).map((p) => [p.id, p]));
      const playersMap = new Map((allPlayers ?? []).map((p) => [p.id, p.name]));

      const result: TournamentPodium[] = [];
      for (const t of tournaments) {
        const finalMatch = (finalMatches ?? []).find((m) => m.tournament_id === t.id);
        if (!finalMatch || !finalMatch.winner_pair_id) continue;

        const champPairId = finalMatch.winner_pair_id;
        const vicePairId = finalMatch.pair_a_id === champPairId ? finalMatch.pair_b_id : finalMatch.pair_a_id;
        if (!vicePairId) continue;

        const champPair = pairsMap.get(champPairId);
        const vicePair = pairsMap.get(vicePairId);
        if (!champPair || !vicePair) continue;

        result.push({
          tournamentId: t.id,
          tournamentName: t.name,
          tournamentDate: t.date,
          champion: [
            playersMap.get(champPair.player1_id) ?? "?",
            playersMap.get(champPair.player2_id) ?? "?",
          ],
          vice: [
            playersMap.get(vicePair.player1_id) ?? "?",
            playersMap.get(vicePair.player2_id) ?? "?",
          ],
        });
      }
      setPodiums(result);
      setLoading(false);
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar ranking: {error}
      </div>
    );
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum torneio finalizado ainda. O ranking aparece aqui após o primeiro torneio ser concluído.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Podium section */}
      {podiums.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Campeões por Torneio</h2>
          {podiums.map((p) => (
            <Card key={p.tournamentId} className="overflow-hidden">
              <CardHeader className="py-2 px-4 bg-brand-light border-b">
                <CardTitle className="text-sm font-semibold text-brand">
                  {p.tournamentName}
                  <span className="font-normal text-muted-foreground ml-2 text-xs">
                    {new Date(p.tournamentDate + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🥇</span>
                  <div>
                    <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">Campeões</span>
                    <p className="text-sm font-medium">{p.champion[0]} &amp; {p.champion[1]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🥈</span>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vice</span>
                    <p className="text-sm text-muted-foreground">{p.vice[0]} &amp; {p.vice[1]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ranking table */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Ranking Geral</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-2 w-8">#</th>
                <th className="text-left py-2 flex-1">Jogador</th>
                <th className="text-center py-2 px-2">Torneios</th>
                <th className="text-right py-2 pl-2 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.player_name_normalized}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedPlayer(r)}
                >
                  <td className="py-2 pr-2 text-muted-foreground font-mono">{i + 1}</td>
                  <td className="py-2 font-medium">{r.player_display_name}</td>
                  <td className="py-2 px-2 text-center text-muted-foreground">{r.total_participacoes}</td>
                  <td className="py-2 pl-2 text-right font-bold text-brand">{r.total_pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={selectedPlayer !== null} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-brand">{selectedPlayer?.player_display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-light/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Torneios</p>
                <p className="text-2xl font-bold">{selectedPlayer?.total_participacoes}</p>
              </div>
              <div className="bg-brand-light/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Pontos Totais</p>
                <p className="text-2xl font-bold text-brand">{selectedPlayer?.total_pts}</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Histórico de Pontos</h3>
              {selectedPlayer && pointsHistory
                .filter(p => p.player_name === selectedPlayer.player_name_normalized)
                .map((history, idx) => {
                  const tInfo = tournamentsMap.get(history.tournament_id);
                  if (!tInfo) return null;
                  return (
                    <Card key={idx} className="overflow-hidden shadow-sm">
                      <CardHeader className="py-2 px-3 bg-muted/30 border-b">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span>{tInfo.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {new Date(tInfo.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3 px-3 text-sm">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Participação</span>
                          <span className="font-medium">+{history.pts_participacao}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Vitórias (Grupos: {history.vitorias_grupo})</span>
                          <span className="font-medium">+{history.pts_vitorias}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">
                            {history.pts_eliminatorias === DEFAULT_POINTS_CONFIG.pts_campeao ? "Eliminatórias (Campeão)" :
                             history.pts_eliminatorias === DEFAULT_POINTS_CONFIG.pts_vice ? "Eliminatórias (Vice-Campeão)" :
                             history.pts_eliminatorias === DEFAULT_POINTS_CONFIG.pts_semis ? "Eliminatórias (Semifinal)" :
                             history.pts_eliminatorias === DEFAULT_POINTS_CONFIG.pts_quartas ? "Eliminatórias (Quartas)" :
                             "Eliminatórias"}
                          </span>
                          <span className="font-medium">+{history.pts_eliminatorias}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-brand">+{history.total_pts}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
