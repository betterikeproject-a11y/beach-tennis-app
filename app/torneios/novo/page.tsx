"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/domain/ranking";
import { toast } from "sonner";

type PlayerEntry = { name: string; isSeed: boolean };

export default function NovoTorneioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MIN = 12, MAX = 32;
  const count = players.length;
  const canSubmit = name.trim() && date && count >= MIN && count <= MAX;

  function addPlayer() {
    const trimmed = playerInput.trim();
    if (!trimmed) return;
    if (players.some((p) => normalizeName(p.name) === normalizeName(trimmed))) {
      toast.error("Jogador já adicionado.");
      return;
    }
    setPlayers((prev) => [...prev, { name: trimmed, isSeed: false }]);
    setPlayerInput("");
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addPlayer(); }
  }

  function removePlayer(idx: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleSeed(idx: number) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, isSeed: !p.isSeed } : p))
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data: tournament, error: te } = await supabase
        .from("tournaments")
        .insert({ name: name.trim(), date, status: "draft", num_classificados_por_grupo: 3, usar_cabecas_de_chave: false })
        .select("id")
        .single();
      if (te || !tournament) throw te ?? new Error("Falha ao criar torneio");

      const playerRows = players.map((p) => ({
        tournament_id: tournament.id,
        name: p.name,
        name_normalized: normalizeName(p.name),
        is_cabeca_de_chave: p.isSeed,
      }));
      const { error: pe } = await supabase.from("players").insert(playerRows);
      if (pe) throw pe;

      router.push(`/torneios/${tournament.id}/sorteio`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao salvar: ${msg}`);
      setSaving(false);
    }
  }

  const seedCount = players.filter((p) => p.isSeed).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Torneio</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome do torneio</Label>
            <Input
              id="name"
              placeholder="Ex: Liga Outubro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Jogadores</span>
            <span
              className={`text-sm font-normal ${
                count < MIN || count > MAX ? "text-red-500" : "text-green-600"
              }`}
            >
              {count} / {MIN}–{MAX}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Nome do jogador (Enter para adicionar)"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={count >= MAX}
            />
            <Button
              variant="outline"
              onClick={addPlayer}
              disabled={!playerInput.trim() || count >= MAX}
            >
              Add
            </Button>
          </div>

          {count > 0 && (
            <div className="flex flex-wrap gap-2">
              {players.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm bg-white"
                >
                  <span>{p.name}</span>
                  <button
                    onClick={() => toggleSeed(i)}
                    className={`text-xs px-1 rounded transition-colors ${
                      p.isSeed ? "text-yellow-600 font-bold" : "text-gray-400 hover:text-yellow-500"
                    }`}
                    title={p.isSeed ? "Remover cabeça de chave" : "Marcar como cabeça de chave"}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => removePlayer(i)}
                    className="text-gray-400 hover:text-red-500 ml-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {seedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {seedCount} cabeça{seedCount !== 1 ? "s" : ""} de chave marcada{seedCount !== 1 ? "s" : ""} (★)
            </p>
          )}

          {count > 0 && (count < MIN || count > MAX) && (
            <p className="text-sm text-red-500">
              {count < MIN
                ? `Adicione mais ${MIN - count} jogador${MIN - count !== 1 ? "es" : ""} (mínimo ${MIN}).`
                : `Máximo ${MAX} jogadores. Remova ${count - MAX}.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full bg-brand hover:bg-brand-hover text-white h-12 text-base"
        disabled={!canSubmit || saving}
        onClick={handleSubmit}
      >
        {saving ? "Salvando…" : "Continuar → Sortear Grupos"}
      </Button>
    </div>
  );
}
