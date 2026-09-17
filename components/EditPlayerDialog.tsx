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
import { Upload, Loader2 } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Player } from "@/lib/types/database";

interface EditPlayerDialogProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPlayerDialog({ player, isOpen, onClose, onSaved }: EditPlayerDialogProps) {
  const [newName, setNewName] = useState(player?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(player?.avatar_url || "");
  const [prevPlayerId, setPrevPlayerId] = useState<string | null>(player?.id || null);
  const [pastPlayers, setPastPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (player && player.id !== prevPlayerId) {
    setPrevPlayerId(player.id);
    setNewName(player.name);
    setAvatarUrl(player.avatar_url || "");
  }

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          toast.error("Não foi possível processar a imagem.");
          setUploadingAvatar(false);
          return;
        }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 120, 120);

        const dataUrl = canvas.toDataURL("image/webp", 0.8);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              setAvatarUrl(dataUrl);
              setUploadingAvatar(false);
              toast.success("Foto comprimida (<15KB)!");
              return;
            }

            const fileName = `${player?.id || Date.now()}-${Date.now()}.webp`;
            const { data, error } = await supabase.storage
              .from("player-avatars")
              .upload(fileName, blob, { contentType: "image/webp", upsert: true });

            if (!error && data) {
              const { data: publicUrlData } = supabase.storage
                .from("player-avatars")
                .getPublicUrl(fileName);
              setAvatarUrl(publicUrlData.publicUrl);
            } else {
              setAvatarUrl(dataUrl);
            }
            toast.success("Foto comprimida e otimizada (<15KB)!");
            setUploadingAvatar(false);
          },
          "image/webp",
          0.8
        );
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Erro no processamento de avatar:", err);
      toast.error("Erro ao carregar imagem.");
      setUploadingAvatar(false);
    }
  }

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

      // 1. Update the name and avatar in players table
      const { error: updatePlayerError } = await supabase
        .from("players")
        .update({
          name: trimmed,
          name_normalized,
          avatar_url: avatarUrl.trim() || null,
        })
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
          <DialogTitle>Editar Atleta</DialogTitle>
          <DialogDescription>
            Altere o nome e personalize a foto do atleta.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview of Avatar */}
        <div className="flex flex-col items-center justify-center gap-2 p-3 bg-muted/40 rounded-lg border">
          <PlayerAvatar
            name={newName || player?.name || ""}
            avatarUrl={avatarUrl.trim() || null}
            size="lg"
          />
          <span className="text-xs text-muted-foreground font-medium">
            Prévia visual do atleta
          </span>
        </div>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="newName">Nome do Atleta</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o nome do atleta"
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Foto de Perfil (Avatar)</Label>
            <div className="flex gap-2 items-center">
              <label className="flex-1 cursor-pointer">
                <div className="h-11 px-3 border border-input rounded-md flex items-center justify-center gap-2 text-xs font-semibold bg-background hover:bg-muted/60 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <Upload className="w-4 h-4 text-brand" />
                  )}
                  <span>{uploadingAvatar ? "Comprimindo..." : "Enviar Foto do Dispositivo"}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={loading || uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="ou cole uma URL de foto (https://...)"
              disabled={loading || uploadingAvatar}
              className="h-11 text-xs"
            />
          </div>

          {pastPlayers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="pastPlayerSelect">Selecionar de Torneios Anteriores</Label>
              <select
                id="pastPlayerSelect"
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
          <Button onClick={handleSave} disabled={loading || uploadingAvatar}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

