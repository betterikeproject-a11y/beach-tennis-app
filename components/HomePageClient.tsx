"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TournamentList } from "@/components/TournamentList";
import { LeagueRanking } from "@/components/LeagueRanking";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Ranking } from "@/lib/types/database";

interface HomePageClientProps {
  initialRankings: Ranking[];
  isAdmin: boolean;
}

export function HomePageClient({ initialRankings, isAdmin }: HomePageClientProps) {
  const [rankings, setRankings] = useState<Ranking[]>(initialRankings);
  const [activeRankingId, setActiveRankingId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newRankingName, setNewRankingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingRanking, setDeletingRanking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load selected ranking from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("selected_ranking_id");
    if (saved && rankings.some((r) => r.id === saved)) {
      setActiveRankingId(saved);
    } else if (rankings.length > 0) {
      // Default to "Masculino B/C", "Geral" or first ranking
      const defaultRanking = rankings.find((r) => {
        const name = r.name.toLowerCase();
        return name === "masculino b/c" || name === "geral";
      });
      setActiveRankingId(defaultRanking ? defaultRanking.id : rankings[0].id);
    }
    setLoading(false);
  }, [rankings]);

  function handleRankingChange(id: string) {
    setActiveRankingId(id);
    localStorage.setItem("selected_ranking_id", id);
  }

  async function handleCreateRanking() {
    const name = newRankingName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("rankings")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;

      setRankings((prev) => [...prev, data]);
      setActiveRankingId(data.id);
      localStorage.setItem("selected_ranking_id", data.id);
      setIsCreateDialogOpen(false);
      setNewRankingName("");
      toast.success(`Ranking "${data.name}" criado com sucesso!`);
    } catch (e: unknown) {
      toast.error(`Erro ao criar ranking: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleArchiveRanking(rankingId: string, archive: boolean) {
    try {
      const { error } = await supabase
        .from("rankings")
        .update({ is_archived: archive })
        .eq("id", rankingId);

      if (error) throw error;

      setRankings((prev) =>
        prev.map((r) => (r.id === rankingId ? { ...r, is_archived: archive } : r))
      );
      toast.success(archive ? "Ranking arquivado com sucesso!" : "Ranking desarquivado com sucesso!");
    } catch (e: unknown) {
      toast.error(`Erro ao atualizar ranking: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleDeleteRanking() {
    if (!activeRankingId) return;
    setDeletingRanking(true);
    try {
      const { error } = await supabase
        .from("rankings")
        .delete()
        .eq("id", activeRankingId);

      if (error) throw error;

      const updated = rankings.filter((r) => r.id !== activeRankingId);
      setRankings(updated);

      if (updated.length > 0) {
        const defaultRanking = updated.find((r) => {
          const name = r.name.toLowerCase();
          return name === "masculino b/c" || name === "geral";
        });
        const nextId = defaultRanking ? defaultRanking.id : updated[0].id;
        handleRankingChange(nextId);
      } else {
        setActiveRankingId("");
        localStorage.removeItem("selected_ranking_id");
      }
      setIsDeleteDialogOpen(false);
      toast.success("Ranking deletado permanentemente.");
    } catch (e: unknown) {
      toast.error(`Erro ao deletar ranking: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeletingRanking(false);
    }
  }

  const activeRanking = rankings.find((r) => r.id === activeRankingId);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando rankings…</div>;
  }

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 max-w-lg mx-auto my-8 p-6 space-y-4 shadow-sm">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-lg font-bold text-gray-800">Nenhum Ranking Encontrado</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O banco de dados não retornou nenhum ranking. Isso geralmente significa que o script de migração SQL ainda não foi executado no painel do Supabase.
        </p>
        <div className="text-xs text-left bg-gray-50 border p-3 rounded-lg font-mono text-gray-600 overflow-x-auto space-y-1">
          <p className="font-semibold text-gray-700">Para corrigir:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Abra o painel do Supabase do seu projeto.</li>
            <li>Vá em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.</li>
            <li>Cole o script SQL que está no arquivo <a href="file:///e:/Hernani_Business/beach-tennis-app/supabase/schema.sql" className="underline font-bold text-brand">supabase/schema.sql</a>.</li>
            <li>Clique em <strong>Run</strong>.</li>
          </ol>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-brand hover:bg-brand-hover text-white font-medium"
          >
            + Criar Primeiro Ranking Manualmente
          </Button>
        )}
      </div>
    );
  }

  if (!activeRankingId) {
    return <div className="text-center py-12 text-muted-foreground">Carregando rankings…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ranking:
          </span>
          <select
            value={activeRankingId}
            onChange={(e) => handleRankingChange(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <optgroup label="Rankings Ativos">
              {rankings.filter(r => !r.is_archived).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            {rankings.some(r => r.is_archived) && (
              <optgroup label="Rankings Arquivados (Passados)">
                {rankings.filter(r => r.is_archived).map((r) => (
                  <option key={r.id} value={r.id}>
                    📦 {r.name} (Arquivado)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="text-xs border-brand/30 text-brand hover:bg-brand-light transition-colors"
            >
              + Novo Ranking
            </Button>
          )}
        </div>

        {isAdmin && (
          <Link href={`/torneios/novo?rankingId=${activeRankingId}`}>
            <Button className="bg-brand hover:bg-brand-hover text-white w-full sm:w-auto font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
              + Novo Torneio ({activeRanking?.name})
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="torneios">
        <TabsList className="w-full">
          <TabsTrigger value="torneios" className="flex-1">Torneios</TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1">Ranking da Liga</TabsTrigger>
          {isAdmin && <TabsTrigger value="config" className="flex-1">Configurações</TabsTrigger>}
        </TabsList>

        <TabsContent value="torneios" className="mt-4">
          <TournamentList rankingId={activeRankingId} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <LeagueRanking rankingId={activeRankingId} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="config" className="mt-4 space-y-4">
            {/* Customização de Pontos Card */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
              <h3 className="font-semibold text-base text-gray-800">Pontuação</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configure os valores de pontuação distribuídos por etapa para o ranking <strong>{activeRanking?.name}</strong>.
              </p>
              <Link href={`/configuracoes?rankingId=${activeRankingId}`}>
                <Button className="bg-brand hover:bg-brand-hover text-white font-medium shadow-sm transition-colors">
                  Configurar Pontuação →
                </Button>
              </Link>
            </div>

            {/* Arquivamento e Exclusão Card */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
              <h3 className="font-semibold text-base text-gray-800">Ações de Gerenciamento</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gerencie o status ou remova o ranking <strong>{activeRanking?.name}</strong>. Arquivar um ranking o esconde do fluxo de torneios ativos, mantendo-o acessível como histórico.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {activeRanking?.is_archived ? (
                  <Button
                    variant="outline"
                    onClick={() => handleArchiveRanking(activeRankingId, false)}
                    className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 transition-colors"
                  >
                    📦 Desarquivar Ranking
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleArchiveRanking(activeRankingId, true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                  >
                    📦 Arquivar Ranking
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                >
                  🗑️ Deletar Ranking Permanentemente
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog for creating a new ranking */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand font-bold">Criar Novo Ranking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ranking-name" className="text-sm font-semibold">
                Nome do Ranking
              </Label>
              <Input
                id="ranking-name"
                placeholder="Ex: Feminino, Masculino B, Geral"
                value={newRankingName}
                onChange={(e) => setNewRankingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreateRanking()}
                disabled={creating}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={creating}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRanking}
              disabled={!newRankingName.trim() || creating}
              className="bg-brand hover:bg-brand-hover text-white flex-1 sm:flex-none font-medium"
            >
              {creating ? "Criando…" : "Criar Ranking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for deleting a ranking */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-bold">Deletar Ranking Permanentemente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Tem certeza absoluta de que deseja deletar o ranking <strong>{activeRanking?.name}</strong>?
            </p>
            <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg font-medium text-xs">
              ⚠️ ATENÇÃO: Esta ação é irreversível e excluirá permanentemente todos os torneios, rodadas, partidas, jogadores e pontuações vinculados a este ranking!
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deletingRanking}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteRanking}
              disabled={deletingRanking}
              className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none font-medium"
            >
              {deletingRanking ? "Deletando…" : "Deletar Ranking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
