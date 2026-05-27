"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import type { LeagueRankingPointsConfig, Ranking } from "@/lib/types/database";

type Config = Omit<LeagueRankingPointsConfig, "ranking_id" | "updated_at">;

const LABELS: Record<keyof Config, string> = {
  pts_participacao: "Participação",
  pts_por_vitoria_grupo: "Por vitória na fase de grupos",
  pts_quartas: "Eliminado nas quartas",
  pts_semis: "Eliminado nas semis",
  pts_vice: "Vice-campeão",
  pts_campeao: "Campeão",
};

function ConfiguracoesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRankingId = searchParams.get("rankingId") || "";

  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [selectedRankingId, setSelectedRankingId] = useState<string>("");
  const [config, setConfig] = useState<Config>({
    pts_participacao: 30,
    pts_por_vitoria_grupo: 20,
    pts_quartas: 60,
    pts_semis: 80,
    pts_vice: 110,
    pts_campeao: 140,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();

  // Load all rankings
  useEffect(() => {
    supabase
      .from("rankings")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setRankings(data);
          const defaultId = queryRankingId && data.some((r) => r.id === queryRankingId)
            ? queryRankingId
            : (data.find((r) => r.name.toLowerCase() === "geral")?.id || data[0]?.id || "");
          setSelectedRankingId(defaultId);
        }
      });
  }, [queryRankingId]);

  // Load config for selected ranking
  useEffect(() => {
    if (!selectedRankingId) return;
    setLoading(true);
    supabase
      .from("league_ranking_points_config")
      .select("*")
      .eq("ranking_id", selectedRankingId)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({
            pts_participacao: data.pts_participacao,
            pts_por_vitoria_grupo: data.pts_por_vitoria_grupo,
            pts_quartas: data.pts_quartas,
            pts_semis: data.pts_semis,
            pts_vice: data.pts_vice,
            pts_campeao: data.pts_campeao,
          });
        }
        setLoading(false);
      });
  }, [selectedRankingId]);

  async function save() {
    if (!selectedRankingId) return;
    setSaving(true);
    const { error } = await supabase
      .from("league_ranking_points_config")
      .upsert({ ranking_id: selectedRankingId, ...config });
    if (error) toast.error(`Erro: ${error.message}`);
    else toast.success("Configurações salvas!");
    setSaving(false);
  }

  const activeRanking = rankings.find((r) => r.id === selectedRankingId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações de Pontuação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estes valores são aplicados no momento da finalização do torneio.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ranking:
          </span>
          <select
            value={selectedRankingId}
            onChange={(e) => setSelectedRankingId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer hover:bg-gray-100 transition-colors"
          >
            {rankings.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pontos para o Ranking: <span className="text-brand font-bold">{activeRanking?.name || "..."}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Carregando configurações…</div>
          ) : (
            (Object.keys(LABELS) as (keyof Config)[]).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="flex-1 font-medium">{LABELS[key]}</Label>
                <Input
                  type="number"
                  min={0}
                  value={config[key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                  className="w-24 text-center font-semibold"
                  disabled={!isAdmin}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isAdmin && !loading && (
        <Button
          className="w-full bg-brand hover:bg-brand-hover text-white h-12 font-medium shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Salvando…" : `Salvar Configurações - ${activeRanking?.name}`}
        </Button>
      )}

      <Button
        variant="ghost"
        onClick={() => router.push("/")}
        className="w-full text-muted-foreground mt-2"
      >
        ← Voltar para a Página Inicial
      </Button>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando…</div>}>
      <ConfiguracoesContent />
    </Suspense>
  );
}
