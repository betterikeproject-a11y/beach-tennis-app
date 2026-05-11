"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
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
  eliminatorias: "bg-brand-light text-brand-hover",
  finalizado: "bg-green-100 text-green-700",
};

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false });

      if (error) { setError(error.message); setLoading(false); return; }

      setTournaments(data ?? []);

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

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", deletingId);
    if (error) {
      toast.error(`Erro ao deletar: ${error.message}`);
    } else {
      setTournaments((prev) => prev.filter((t) => t.id !== deletingId));
      toast.success("Torneio deletado.");
    }
    setDeleting(false);
    setDeletingId(null);
  }

  const deletingTournament = tournaments.find((t) => t.id === deletingId);

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
    <>
      <div className="space-y-3">
        {tournaments.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <Link href={`/torneios/${t.id}`} className="flex-1 flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")} ·{" "}
                    {counts[t.id] ?? 0} jogadores
                  </p>
                </div>
                <Badge className={`shrink-0 ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </Badge>
              </Link>
              <button
                onClick={() => setDeletingId(t.id)}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Deletar torneio"
              >
                <Trash2 size={16} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deletar torneio</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar <strong>{deletingTournament?.name}</strong>?
              Todos os grupos, partidas e pontos do ranking deste torneio serão apagados permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={deleting}>
              Cancelar
            </DialogClose>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deletando…" : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
