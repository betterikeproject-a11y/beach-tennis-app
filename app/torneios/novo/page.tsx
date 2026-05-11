"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/domain/ranking";
import { toast } from "sonner";
import type { LeagueRankingRow } from "@/lib/types/database";

type PlayerEntry = { name: string; isSeed: boolean };

export default function NovoTorneioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [pastPlayers, setPastPlayers] = useState<LeagueRankingRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const MIN = 12, MAX = 32;
  const count = players.length;
  const canSubmit = name.trim() && date && count >= MIN && count <= MAX;

  useEffect(() => {
    supabase
      .from("league_ranking")
      .select("*")
      .order("total_pts", { ascending: false })
      .then(({ data }) => setPastPlayers(data ?? []));
  }, []);

  // Suggestions: past players not yet added, filtered by what's being typed
  const addedNormalized = new Set(players.map((p) => normalizeName(p.name)));
  const searchTerm = normalizeName(playerInput);
  const suggestions = pastPlayers.filter((pp) => {
    const norm = pp.player_name_normalized;
    if (addedNormalized.has(norm)) return false;
    if (searchTerm) return norm.includes(searchTerm) || pp.player_display_name.toLowerCase().includes(playerInput.toLowerCase());
    return true;
  });

  function addPlayerByName(displayName: string) {
    if (count >= MAX) return;
    const norm = normalizeName(displayName);
    if (addedNormalized.has(norm)) return;
    setPlayers((prev) => [...prev, { name: displayName, isSeed: false }]);
    setPlayerInput("");
    inputRef.current?.focus();
  }

  function addPlayer() {
    const trimmed = playerInput.trim();
    if (!trimmed) return;
    // If there's an exact match in suggestions, use that display name (preserves correct casing)
    const match = pastPlayers.find((pp) => pp.player_name_normalized === normalizeName(trimmed));
    const nameToAdd = match ? match.player_display_name : trimmed;
    if (addedNormalized.has(normalizeName(nameToAdd))) {
      toast.error("Jogador já adicionado.");
      return;
    }
    setPlayers((prev) => [...prev, { name: nameToAdd, isSeed: false }]);
    setPlayerInput("");
    inputRef.current?.focus();
  }

  function addAllSuggestions() {
    const toAdd = suggestions.slice(0, MAX - count);
    setPlayers((prev) => [
      ...prev,
      ...toAdd.map((pp) => ({ name: pp.player_display_name, isSeed: false })),
    ]);
    setPlayerInput("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // If typing and there's exactly one suggestion, add it
      if (playerInput.trim() && suggestions.length === 1) {
        addPlayerByName(suggestions[0].player_display_name);
      } else {
        addPlayer();
      }
    }
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
            <span className={`text-sm font-normal ${count < MIN || count > MAX ? "text-red-500" : "text-green-600"}`}>
              {count} / {MIN}–{MAX}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Input manual */}
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

          {/* Sugestões de jogadores anteriores */}
          {suggestions.length > 0 && count < MAX && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {playerInput
                    ? `${suggestions.length} jogador${suggestions.length !== 1 ? "es" : ""} encontrado${suggestions.length !== 1 ? "s" : ""} no histórico`
                    : `${suggestions.length} jogador${suggestions.length !== 1 ? "es" : ""} do histórico da liga`}
                </p>
                {!playerInput && suggestions.length > 1 && (
                  <button
                    onClick={addAllSuggestions}
                    className="text-xs text-brand hover:text-brand-hover font-medium underline"
                  >
                    Adicionar todos
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {suggestions.map((pp) => (
                  <button
                    key={pp.player_name_normalized}
                    onClick={() => addPlayerByName(pp.player_display_name)}
                    disabled={count >= MAX}
                    className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-sm hover:bg-brand/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="font-medium">{pp.player_display_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {pp.total_participacoes}×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jogadores adicionados */}
          {count > 0 && (
            <div className="space-y-2 pt-1 border-t">
              <p className="text-xs text-muted-foreground font-medium">Adicionados ({count})</p>
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
