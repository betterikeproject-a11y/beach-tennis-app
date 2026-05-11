"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tournament } from "@/lib/types/database";

const STATUS_LABEL: Record<Tournament["status"], string> = {
  draft: "Rascunho",
  grupos: "Fase de Grupos",
  eliminatorias: "Eliminatórias",
  finalizado: "Finalizado",
};

const STATUS_COLOR: Record<Tournament["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  grupos: "bg-blue-100 text-blue-700",
  eliminatorias: "bg-orange-100 text-orange-700",
  finalizado: "bg-green-100 text-green-700",
};

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false });

      if (error) { setError(error.message); setLoading(false); return; }

      setTournaments(data ?? []);

      // load player counts
      if (data && data.length > 0) {
        const { data: players } = await supabase
          .from("players")
          .select("tournament_id")
          .in("tournament_id", data.map((t) => t.id));
        const map: Record<string, number> = {};
        for (const p of players ?? []) {
          map[p.tournament_id] = (map[p.tournament_id] ?? 0) + 1;
        }
        setCounts(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar torneios: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">🎾</p>
        <p className="font-medium">Nenhum torneio ainda.</p>
        <p className="text-sm mt-1">Crie o primeiro usando o botão acima!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t) => (
        <Link key={t.id} href={`/torneios/${t.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")} ·{" "}
                  {counts[t.id] ?? 0} jogadores
                </p>
              </div>
              <Badge className={`shrink-0 ${STATUS_COLOR[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
