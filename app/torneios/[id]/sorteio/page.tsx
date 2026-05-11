"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { drawGroups } from "@/lib/domain/draw";
import { generateGroupMatches } from "@/lib/domain/matches";
import { toast } from "sonner";
import type { Player } from "@/lib/types/database";
import type { GroupDraw } from "@/lib/domain/draw";

export default function SorteioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [draw, setDraw] = useState<GroupDraw | null>(null);
  const [useSeeds, setUseSeeds] = useState(true);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("players")
      .select("*")
      .eq("tournament_id", id)
      .then(({ data }) => {
        setPlayers(data ?? []);
        setLoading(false);
      });
  }, [id]);

  const hasSeeds = players.some((p) => p.is_cabeca_de_chave);

  function runDraw() {
    setDrawError(null);
    try {
      const mapped = players.map((p) => ({
        id: p.id,
        name: p.name,
        isCabecaDeChave: p.is_cabeca_de_chave,
      }));
      const result = drawGroups(mapped, useSeeds && hasSeeds);
      setDraw(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDrawError(msg);
    }
  }

  async function confirmDraw() {
    if (!draw) return;
    setConfirming(true);
    try {
      // 1. Delete existing groups/members/matches
      const { data: existingGroups } = await supabase
        .from("groups")
        .select("id")
        .eq("tournament_id", id);
      if (existingGroups && existingGroups.length > 0) {
        await supabase.from("groups").delete().eq("tournament_id", id);
      }

      // 2. Insert groups and members
      for (const g of draw) {
        const { data: group, error: ge } = await supabase
          .from("groups")
          .insert({ tournament_id: id, group_number: g.groupNumber })
          .select("id")
          .single();
        if (ge || !group) throw ge ?? new Error("Falha ao criar grupo");

        await supabase.from("group_members").insert(
          g.players.map((p) => ({ group_id: group.id, player_id: p.id }))
        );

        // 3. Generate and insert matches
        const matchRows = generateGroupMatches(g.players.map((p) => p.id), group.id);
        await supabase.from("group_matches").insert(matchRows);
      }

      // 4. Update tournament status
      await supabase
        .from("tournaments")
        .update({ status: "grupos" })
        .eq("id", id);

      toast.success("Grupos confirmados!");
      router.push(`/torneios/${id}/grupos`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Erro: ${msg}`);
      setConfirming(false);
    }
  }

  const GROUP_COLORS = ["bg-blue-50 border-blue-200", "bg-green-50 border-green-200", "bg-purple-50 border-purple-200", "bg-orange-50 border-orange-200", "bg-pink-50 border-pink-200", "bg-teal-50 border-teal-200", "bg-yellow-50 border-yellow-200", "bg-red-50 border-red-200"];

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando jogadores…</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sorteio de Grupos</h1>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {players.length} jogadores · {hasSeeds ? `${players.filter(p => p.is_cabeca_de_chave).length} cabeças de chave` : "sem cabeças"}
            </span>
          </div>

          {hasSeeds && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSeeds}
                onChange={(e) => { setUseSeeds(e.target.checked); setDraw(null); }}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm">Usar cabeças de chave no sorteio</span>
            </label>
          )}

          {drawError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {drawError}
            </div>
          )}

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={runDraw}
          >
            {draw ? "Sortear Novamente" : "Sortear Grupos"}
          </Button>
        </CardContent>
      </Card>

      {draw && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {draw.map((g, gi) => (
              <Card key={g.groupNumber} className={`border-2 ${GROUP_COLORS[gi % GROUP_COLORS.length]}`}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold">Grupo {g.groupNumber}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="space-y-1">
                    {g.players.map((p) => (
                      <li key={p.id} className="text-sm flex items-center gap-1">
                        {p.isCabecaDeChave && <span className="text-yellow-500 text-xs">★</span>}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
            onClick={confirmDraw}
            disabled={confirming}
          >
            {confirming ? "Salvando…" : "Confirmar e Avançar para Jogos →"}
          </Button>
        </>
      )}
    </div>
  );
}
