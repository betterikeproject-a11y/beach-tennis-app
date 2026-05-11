"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeagueRankingRow } from "@/lib/types/database";

export function LeagueRanking() {
  const [rows, setRows] = useState<LeagueRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("league_ranking")
        .select("*")
        .order("total_pts", { ascending: false });
      if (error) { setError(error.message); }
      else { setRows(data ?? []); }
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
    return <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum torneio finalizado ainda. O ranking aparece aqui após o primeiro torneio ser concluído.
      </div>
    );
  }

  return (
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
              <td className="py-2 pl-2 text-right font-bold text-orange-600">{r.total_pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
