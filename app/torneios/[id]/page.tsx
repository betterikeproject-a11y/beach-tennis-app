import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TournamentPlayersList } from "@/components/TournamentPlayersList";
import { TournamentStepper } from "@/components/TournamentStepper";
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
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_token")?.value === "true";
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
      <TournamentStepper tournamentId={id} currentStatus={tournament.status} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(tournament.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Badge className="mt-1 shrink-0">{STATUS_LABEL[tournament.status]}</Badge>
      </div>

      {isAdmin && nextUrl && (
        <Link href={nextUrl}>
          <Button className="w-full bg-brand hover:bg-brand-hover text-white h-12">
            {tournament.status === "draft" && "Sortear Grupos →"}
            {tournament.status === "grupos" && "Ver Fase de Grupos →"}
            {tournament.status === "eliminatorias" && "Ver Eliminatórias →"}
          </Button>
        </Link>
      )}

      <TournamentPlayersList players={players ?? []} isAdmin={isAdmin} />

      {isAdmin && tournament.status === "grupos" && (
        <div className="flex gap-2">
          <Link href={`/torneios/${id}/grupos`} className="flex-1">
            <Button variant="outline" className="w-full">Jogos dos Grupos</Button>
          </Link>
          <Link href={`/torneios/${id}/classificacao`} className="flex-1">
            <Button variant="outline" className="w-full">Classificação</Button>
          </Link>
        </div>
      )}

      {(tournament.status === "grupos" || tournament.status === "eliminatorias" || tournament.status === "finalizado") && (
        <Link href={`/torneios/${id}/visualizacao`} target="_blank">
          <Button variant="outline" className="w-full text-muted-foreground">
            👁 Visualização ao vivo (abrir em nova aba)
          </Button>
        </Link>
      )}
    </div>
  );
}
