"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueRankingRow } from "@/lib/types/database";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: rankingData, error: rankingErr }, { data: finishedTournaments }] = await Promise.all([
        supabase.from("league_ranking").select("*").order("total_pts", { ascending: false }),
        supabase.from("tournaments").select("id, name, date").eq("status", "finalizado").order("date", { ascending: false }),
      ]);

      if (rankingErr) { setError(rankingErr.message); setLoading(false); return; }
      setRows(rankingData ?? []);

      const tournaments = finishedTournaments ?? [];
      if (tournaments.length === 0) { setLoading(false); return; }

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
                <th className="text-right py-2 px-2">Torneios</th>
                <th className="text-right py-2 px-2">V</th>
                <th className="text-right py-2 pl-2 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_name_normalized} className="border-b last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground font-mono">{i + 1}</td>
                  <td className="py-2 font-medium">{r.player_display_name}</td>
                  <td className="py-2 px-2 text-center text-muted-foreground">{r.total_participacoes}</td>
                  <td className="py-2 px-2 text-center text-muted-foreground">{r.total_vitorias}</td>
                  <td className="py-2 pl-2 text-right font-bold text-brand">{r.total_pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
