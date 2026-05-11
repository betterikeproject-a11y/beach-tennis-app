import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tournament, TournamentStatus, Player } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Rascunho",
  grupos: "Fase de Grupos",
  eliminatorias: "Eliminatórias",
  finalizado: "Finalizado",
};

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = serverSupabase();

  const { data: tournament } = await sb.from("tournaments").select("*").eq("id", id).single() as { data: Tournament | null };
  if (!tournament) redirect("/");

  const { data: players } = await sb.from("players").select("*").eq("tournament_id", id) as { data: Player[] | null };

  const nextUrl = {
    draft: `/torneios/${id}/sorteio`,
    grupos: `/torneios/${id}/grupos`,
    eliminatorias: `/torneios/${id}/eliminatorias`,
    finalizado: null,
  }[tournament.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(tournament.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Badge className="mt-1 shrink-0">{STATUS_LABEL[tournament.status]}</Badge>
      </div>

      {nextUrl && (
        <Link href={nextUrl}>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12">
            {tournament.status === "draft" && "Sortear Grupos →"}
            {tournament.status === "grupos" && "Ver Fase de Grupos →"}
            {tournament.status === "eliminatorias" && "Ver Eliminatórias →"}
          </Button>
        </Link>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Jogadores ({players?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(players ?? []).map((p) => (
              <span key={p.id} className="rounded-full border px-3 py-1 text-sm bg-white flex items-center gap-1">
                {p.is_cabeca_de_chave && <span className="text-yellow-500 text-xs">★</span>}
                {p.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {tournament.status === "grupos" && (
        <div className="flex gap-2">
          <Link href={`/torneios/${id}/grupos`} className="flex-1">
            <Button variant="outline" className="w-full">Jogos dos Grupos</Button>
          </Link>
          <Link href={`/torneios/${id}/classificacao`} className="flex-1">
            <Button variant="outline" className="w-full">Classificação</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
