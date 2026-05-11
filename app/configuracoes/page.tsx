"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { LeagueRankingPointsConfig } from "@/lib/types/database";

type Config = Omit<LeagueRankingPointsConfig, "id" | "updated_at">;

const LABELS: Record<keyof Config, string> = {
  pts_participacao: "Participação",
  pts_por_vitoria_grupo: "Por vitória na fase de grupos",
  pts_quartas: "Eliminado nas quartas",
  pts_semis: "Eliminado nas semis",
  pts_vice: "Vice-campeão",
  pts_campeao: "Campeão",
};

export default function ConfiguracoesPage() {
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

  useEffect(() => {
    supabase
      .from("league_ranking_points_config")
      .select("*")
      .eq("id", 1)
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
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("league_ranking_points_config")
      .upsert({ id: 1, ...config });
    if (error) toast.error(`Erro: ${error.message}`);
    else toast.success("Configurações salvas!");
    setSaving(false);
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações de Pontuação</h1>
      <p className="text-sm text-muted-foreground">
        Estes valores são aplicados a todos os torneios no momento da finalização.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Pontos por resultado</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(LABELS) as (keyof Config)[]).map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="flex-1">{LABELS[key]}</Label>
              <Input
                type="number"
                min={0}
                value={config[key]}
                onChange={(e) => setConfig((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                className="w-24 text-center"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        className="w-full bg-brand hover:bg-brand-hover text-white h-12"
        onClick={save}
        disabled={saving}
      >
        {saving ? "Salvando…" : "Salvar Configurações"}
      </Button>
    </div>
  );
}
