"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/domain/ranking";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Player } from "@/lib/types/database";

interface EditPlayerDialogProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPlayerDialog({ player, isOpen, onClose, onSaved }: EditPlayerDialogProps) {
  const [newName, setNewName] = useState("");
  const [pastPlayers, setPastPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (player) {
      setNewName(player.name);
    }
  }, [player]);

  useEffect(() => {
    if (isOpen && player) {
      supabase
        .from("tournament_player_points")
        .select("player_display_name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Erro ao buscar jogadores passados:", error);
            return;
          }
          if (data) {
            const uniqueNames = Array.from(new Set(data.map((r) => r.player_display_name)))
              .filter((name) => name.toLowerCase() !== player.name.toLowerCase());
            setPastPlayers(uniqueNames.sort());
          }
        });
    }
  }, [isOpen, player]);

  async function handleSave() {
    if (!player) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("O nome do jogador não pode ser vazio.");
      return;
    }

    setLoading(true);
    try {
      const name_normalized = normalizeName(trimmed);

      // Check if player name already exists in this tournament (excluding the current player)
      const { data: existing, error: checkError } = await supabase
        .from("players")
        .select("id")
        .eq("tournament_id", player.tournament_id)
        .eq("name_normalized", name_normalized)
        .neq("id", player.id);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        toast.error("Este jogador já está participando deste torneio.");
        setLoading(false);
        return;
      }

      // 1. Update the name in players table
      const { error: updatePlayerError } = await supabase
        .from("players")
        .update({ name: trimmed, name_normalized })
        .eq("id", player.id);

      if (updatePlayerError) throw updatePlayerError;

      // 2. Update the name in tournament_player_points table (if the tournament was finalized)
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("status")
        .eq("id", player.tournament_id)
        .single();

      if (tournament && tournament.status === "finalizado") {
        const { error: updatePointsError } = await supabase
          .from("tournament_player_points")
          .update({
            player_name: name_normalized,
            player_display_name: trimmed,
          })
          .eq("tournament_id", player.tournament_id)
          .eq("player_name", player.name_normalized);

        if (updatePointsError) {
          console.error("Erro ao atualizar pontos do jogador:", updatePointsError);
        }
      }

      toast.success("Jogador atualizado com sucesso!");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar jogador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Nome do Jogador</DialogTitle>
          <DialogDescription>
            Altere o nome do jogador sorteado. Seus pontos e jogos serão atribuídos ao novo nome.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="newName">Nome do Jogador</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o nome do jogador"
              disabled={loading}
            />
          </div>

          {pastPlayers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="pastPlayerSelect">Selecionar de Torneios Anteriores</Label>
              <select
                id="pastPlayerSelect"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onChange={(e) => {
                  if (e.target.value) {
                    setNewName(e.target.value);
                  }
                }}
                disabled={loading}
                defaultValue=""
              >
                <option value="" disabled>-- Escolha um jogador --</option>
                {pastPlayers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
