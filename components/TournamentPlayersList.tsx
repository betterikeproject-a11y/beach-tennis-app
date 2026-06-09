"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPlayerDialog } from "@/components/EditPlayerDialog";
import type { Player } from "@/lib/types/database";

interface TournamentPlayersListProps {
  players: Player[];
  isAdmin: boolean;
}

export function TournamentPlayersList({ players: initialPlayers, isAdmin }: TournamentPlayersListProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Sync state when props update
  if (JSON.stringify(initialPlayers) !== JSON.stringify(players)) {
    setPlayers(initialPlayers);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jogadores ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span
                key={p.id}
                onClick={() => isAdmin && setSelectedPlayer(p)}
                className={`rounded-full border px-3 py-1 text-sm bg-white flex items-center gap-1 transition-colors select-none ${
                  isAdmin
                    ? "cursor-pointer hover:bg-brand-light hover:border-brand/40"
                    : ""
                }`}
                title={isAdmin ? "Clique para editar jogador" : undefined}
              >
                {p.is_cabeca_de_chave && <span className="text-yellow-500 text-xs">★</span>}
                {p.name}
                {isAdmin && <span className="text-[10px] text-muted-foreground ml-0.5 opacity-60">✎</span>}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <EditPlayerDialog
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        onSaved={() => {
          router.refresh();
        }}
      />
    </>
  );
}
