"use client";

import { use, useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  GripVertical,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TournamentStepper } from "@/components/TournamentStepper";
import { EditPlayerDialog } from "@/components/EditPlayerDialog";
import { useAuth } from "@/components/AuthProvider";

import { supabase } from "@/lib/supabase";
import { computeGroupStandings, computeOverallStandings } from "@/lib/domain/standings";
import { generateBracket, suggestStartingPhase } from "@/lib/domain/bracket";
import { cn } from "@/lib/utils";

import type { Player, Group, GroupMatch, TournamentStatus } from "@/lib/types/database";
import type { PlayerStanding } from "@/lib/domain/standings";

type RichPlayer = PlayerStanding & { groupNumber: number };
type PairEntry = { p1: RichPlayer; p2: RichPlayer };

function ordinal(n: number) {
  return `${n}º`;
}

// ────────────────────────────────────────────────────────────
// DRAGGABLE PLAYER CARD COMPONENT
// ────────────────────────────────────────────────────────────
interface DraggablePlayerSlotProps {
  id: string;
  player: RichPlayer;
  pairIdx: number;
  slot: 0 | 1;
  isAdmin: boolean;
  onQuickSwap: () => void;
  isDragging?: boolean;
}

function DraggablePlayerSlot({
  id,
  player,
  isAdmin,
  onQuickSwap,
  isDragging,
}: DraggablePlayerSlotProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { player },
    disabled: !isAdmin,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 99,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent transition-all bg-card",
        isAdmin && "hover:border-brand/40 hover:bg-muted/40",
        isDragging && "opacity-40 border-dashed border-brand bg-brand-light/30"
      )}
    >
      {isAdmin && (
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="p-1 text-muted-foreground hover:text-brand cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Segure e arraste para trocar de dupla"
          aria-label="Arrastar atleta"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <PlayerAvatar name={player.playerName} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{player.playerName}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
            Gr. {player.groupNumber}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ordinal(player.position)} geral · {player.wins}V · Saldo{" "}
          <span className={player.saldo >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
            {player.saldo > 0 ? `+${player.saldo}` : player.saldo}
          </span>
        </p>
      </div>

      {isAdmin && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onQuickSwap}
          className="h-8 px-2 text-xs text-brand hover:text-brand-hover hover:bg-brand-light shrink-0"
        >
          <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
          Trocar
        </Button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// DROPPABLE PAIR CARD COMPONENT
// ────────────────────────────────────────────────────────────
interface DroppablePairCardProps {
  pairIdx: number;
  pair: PairEntry;
  isAdmin: boolean;
  editingSlot: { pairIdx: number; slot: 0 | 1 } | null;
  onStartEdit: (slot: 0 | 1) => void;
  onCancelEdit: () => void;
  onSelectSwap: (slot: 0 | 1, targetPlayerId: string) => void;
  allClassified: RichPlayer[];
  activeId: string | null;
}

function DroppablePairCard({
  pairIdx,
  pair,
  isAdmin,
  editingSlot,
  onStartEdit,
  onCancelEdit,
  onSelectSwap,
  allClassified,
  activeId,
}: DroppablePairCardProps) {
  const dropId0 = `slot-${pairIdx}-0`;
  const dropId1 = `slot-${pairIdx}-1`;

  const { setNodeRef: setDrop0, isOver: isOver0 } = useDroppable({ id: dropId0 });
  const { setNodeRef: setDrop1, isOver: isOver1 } = useDroppable({ id: dropId1 });

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs hover:border-brand/40 transition-colors">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Seed Badge */}
          <div className="bg-gradient-to-br from-[#4ABACC] to-[#389EAF] text-white flex sm:flex-col items-center justify-between sm:justify-center px-4 py-2 sm:py-0 min-w-[80px] shrink-0">
            <span className="text-[11px] font-medium tracking-wider uppercase opacity-90">Dupla</span>
            <span className="text-xl sm:text-2xl font-bold font-mono">#{pairIdx + 1}</span>
            <span className="text-[10px] opacity-75 hidden sm:block">Seed {pairIdx + 1}</span>
          </div>

          {/* Slots */}
          <div className="flex-1 divide-y divide-border/60">
            {/* Slot 0 */}
            <div
              ref={setDrop0}
              className={cn(
                "p-2 transition-all",
                isOver0 && "bg-brand-light/60 ring-2 ring-brand ring-inset"
              )}
            >
              {editingSlot?.pairIdx === pairIdx && editingSlot?.slot === 0 ? (
                <div className="flex items-center gap-2 p-1">
                  <select
                    autoFocus
                    className="flex-1 h-10 border rounded-md px-2 text-sm bg-background focus:ring-2 focus:ring-brand"
                    defaultValue={pair.p1.playerId}
                    onChange={(e) => onSelectSwap(0, e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione um atleta classificado…
                    </option>
                    {allClassified.map((cp) => (
                      <option key={cp.playerId} value={cp.playerId}>
                        {cp.playerName} (Gr. {cp.groupNumber} · {cp.wins}V · Saldo {cp.saldo})
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-10 text-xs">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <DraggablePlayerSlot
                  id={`player-${pair.p1.playerId}`}
                  player={pair.p1}
                  pairIdx={pairIdx}
                  slot={0}
                  isAdmin={isAdmin}
                  onQuickSwap={() => onStartEdit(0)}
                  isDragging={activeId === `player-${pair.p1.playerId}`}
                />
              )}
            </div>

            {/* Slot 1 */}
            <div
              ref={setDrop1}
              className={cn(
                "p-2 transition-all",
                isOver1 && "bg-brand-light/60 ring-2 ring-brand ring-inset"
              )}
            >
              {editingSlot?.pairIdx === pairIdx && editingSlot?.slot === 1 ? (
                <div className="flex items-center gap-2 p-1">
                  <select
                    autoFocus
                    className="flex-1 h-10 border rounded-md px-2 text-sm bg-background focus:ring-2 focus:ring-brand"
                    defaultValue={pair.p2.playerId}
                    onChange={(e) => onSelectSwap(1, e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione um atleta classificado…
                    </option>
                    {allClassified.map((cp) => (
                      <option key={cp.playerId} value={cp.playerId}>
                        {cp.playerName} (Gr. {cp.groupNumber} · {cp.wins}V · Saldo {cp.saldo})
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-10 text-xs">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <DraggablePlayerSlot
                  id={`player-${pair.p2.playerId}`}
                  player={pair.p2}
                  pairIdx={pairIdx}
                  slot={1}
                  isAdmin={isAdmin}
                  onQuickSwap={() => onStartEdit(1)}
                  isDragging={activeId === `player-${pair.p2.playerId}`}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pure helper to pair sorted athletes
function buildPairsFromOverall(overallList: RichPlayer[], countPerGroup: number): PairEntry[] {
  if (overallList.length === 0) return [];

  const byGroup: Record<number, RichPlayer[]> = {};
  for (const s of overallList) {
    byGroup[s.groupNumber] = byGroup[s.groupNumber] ?? [];
    byGroup[s.groupNumber].push(s);
  }

  const sortFn = (a: RichPlayer, b: RichPlayer) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    return a.playerName.localeCompare(b.playerName, "pt-BR", { sensitivity: "base" });
  };

  const classifiedOverall = computeOverallStandings(
    Object.keys(byGroup).map((gn) =>
      byGroup[Number(gn)].slice().sort(sortFn).slice(0, countPerGroup)
    )
  ).map((s) => ({
    ...s,
    groupNumber: overallList.find((ao) => ao.playerId === s.playerId)?.groupNumber ?? 0,
  }));

  const newPairs: PairEntry[] = [];
  for (let i = 0; i + 1 < classifiedOverall.length; i += 2) {
    newPairs.push({ p1: classifiedOverall[i], p2: classifiedOverall[i + 1] });
  }
  return newPairs;
}

// ────────────────────────────────────────────────────────────
// MAIN CLASSIFICACAO PAGE
// ────────────────────────────────────────────────────────────
export default function ClassificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const dndContextId = useId();

  const [allOverall, setAllOverall] = useState<RichPlayer[]>([]);
  const [numClassifica, setNumClassifica] = useState(3);
  const [pairs, setPairs] = useState<PairEntry[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ pairIdx: number; slot: 0 | 1 } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>("eliminatorias");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const { isAdmin } = useAuth();

  const handleNumClassificaChange = (newVal: number) => {
    setNumClassifica(newVal);
    setPairs(buildPairsFromOverall(allOverall, newVal));
    setEditingSlot(null);
  };

  const [refreshKey, setRefreshKey] = useState(0);

  // Sensors setup for touch & mouse
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  useEffect(() => {
    let active = true;

    async function fetchStandings() {
      try {
        const [
          { data: tournament },
          { data: groups },
          { data: members },
          { data: matches },
          { data: playersData },
        ] = await Promise.all([
          supabase.from("tournaments").select("status").eq("id", id).single(),
          supabase.from("groups").select("*").eq("tournament_id", id).order("group_number"),
          supabase.from("group_members").select("*"),
          supabase.from("group_matches").select("*"),
          supabase.from("players").select("*").eq("tournament_id", id),
        ]);

        if (!active) return;
        if (tournament) setTournamentStatus(tournament.status as TournamentStatus);

        const groupRows = groups ?? [];
        const allPlayers = playersData ?? [];

        const perGroupStandings = groupRows.map((g: Group) => {
          const groupMembers = (members ?? []).filter((m) => m.group_id === g.id);
          const memberIds = groupMembers.map((m) => m.player_id);
          const gPlayers = allPlayers.filter((p: Player) => memberIds.includes(p.id));
          const gMatches = (matches ?? []).filter((m: GroupMatch) => m.group_id === g.id);
          const overrides: Record<string, number | null> = {};
          for (const gm of groupMembers) overrides[gm.player_id] = gm.position_override;
          const standings = computeGroupStandings(
            gPlayers.map((p: Player) => ({ id: p.id, name: p.name })),
            gMatches,
            overrides
          );
          return standings.map((s) => ({ ...s, groupNumber: g.group_number }));
        });

        const overall = computeOverallStandings(perGroupStandings).map((s, i) => ({
          ...s,
          groupNumber:
            perGroupStandings.flat().find((ps) => ps.playerId === s.playerId)?.groupNumber ?? 0,
          position: i + 1,
        }));
        setAllOverall(overall);
        setPairs(buildPairsFromOverall(overall, numClassifica));
        setEditingSlot(null);
      } catch {
        if (active) toast.error("Erro ao carregar classificação");
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchStandings();

    return () => {
      active = false;
    };
  }, [id, numClassifica, refreshKey]);

  const classifiedList = pairs.flatMap((p) => [p.p1, p.p2]);
  const classifiedIds = new Set(classifiedList.map((p) => p.playerId));
  const eliminatedList = allOverall.filter((p) => !classifiedIds.has(p.playerId));

  // Swap logic between slots
  function swapPlayers(playerAId: string, playerBId: string) {
    setPairs((prev) => {
      const next = prev.map((p) => ({ p1: { ...p.p1 }, p2: { ...p.p2 } }));
      let posA: { pairIdx: number; slot: 0 | 1 } | null = null;
      let posB: { pairIdx: number; slot: 0 | 1 } | null = null;

      for (let pi = 0; pi < next.length; pi++) {
        if (next[pi].p1.playerId === playerAId) posA = { pairIdx: pi, slot: 0 };
        if (next[pi].p2.playerId === playerAId) posA = { pairIdx: pi, slot: 1 };
        if (next[pi].p1.playerId === playerBId) posB = { pairIdx: pi, slot: 0 };
        if (next[pi].p2.playerId === playerBId) posB = { pairIdx: pi, slot: 1 };
      }

      if (posA && posB) {
        const temp = posA.slot === 0 ? next[posA.pairIdx].p1 : next[posA.pairIdx].p2;
        const target = posB.slot === 0 ? next[posB.pairIdx].p1 : next[posB.pairIdx].p2;

        if (posA.slot === 0) next[posA.pairIdx].p1 = target;
        else next[posA.pairIdx].p2 = target;

        if (posB.slot === 0) next[posB.pairIdx].p1 = temp;
        else next[posB.pairIdx].p2 = temp;
      }
      return next;
    });
    toast.success("Duplas atualizadas com sucesso!");
  }

  function swapSlotWithTarget(targetPairIdx: number, targetSlot: 0 | 1, incomingPlayerId: string) {
    const targetPlayer = targetSlot === 0 ? pairs[targetPairIdx].p1 : pairs[targetPairIdx].p2;
    if (targetPlayer.playerId === incomingPlayerId) {
      setEditingSlot(null);
      return;
    }
    swapPlayers(targetPlayer.playerId, incomingPlayerId);
    setEditingSlot(null);
  }

  // Handle Drag & Drop events
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // active.id is `player-${playerId}`
    const activePlayerId = String(active.id).replace("player-", "");
    const overIdStr = String(over.id);

    // If dropped over a slot: `slot-${pairIdx}-${slot}`
    if (overIdStr.startsWith("slot-")) {
      const parts = overIdStr.split("-");
      const targetPairIdx = parseInt(parts[1], 10);
      const targetSlot = parseInt(parts[2], 10) as 0 | 1;

      const targetPlayer =
        targetSlot === 0 ? pairs[targetPairIdx].p1 : pairs[targetPairIdx].p2;
      if (targetPlayer && targetPlayer.playerId !== activePlayerId) {
        swapPlayers(activePlayerId, targetPlayer.playerId);
      }
    } else if (overIdStr.startsWith("player-")) {
      const targetPlayerId = overIdStr.replace("player-", "");
      if (targetPlayerId !== activePlayerId) {
        swapPlayers(activePlayerId, targetPlayerId);
      }
    }
  }

  // Check for statistical ties among classified players
  const tiedGroups = (() => {
    const ties: Array<{ p1: RichPlayer; p2: RichPlayer }> = [];
    for (let i = 0; i < classifiedList.length - 1; i++) {
      const a = classifiedList[i];
      const b = classifiedList[i + 1];
      if (a.points === b.points && a.saldo === b.saldo && a.gamesFor === b.gamesFor) {
        ties.push({ p1: a, p2: b });
      }
    }
    return ties;
  })();

  async function generateKnockout() {
    if (pairs.length === 0) return;
    setGenerating(true);
    try {
      await supabase.from("knockout_pairs").delete().eq("tournament_id", id);
      await supabase.from("knockout_matches").delete().eq("tournament_id", id);

      const pairRows = pairs.map((pair, i) => ({
        tournament_id: id,
        seed: i + 1,
        player1_id: pair.p1.playerId,
        player2_id: pair.p2.playerId,
      }));

      const { data: insertedPairs, error: pe } = await supabase
        .from("knockout_pairs")
        .insert(pairRows)
        .select("id, seed");

      if (pe || !insertedPairs) throw pe ?? new Error("Falha ao inserir duplas");

      const bracket = generateBracket(
        insertedPairs.map((p: { id: string; seed: number }) => ({ id: p.id, seed: p.seed }))
      );

      const { error: me } = await supabase.from("knockout_matches").insert(
        bracket.map((m) => ({
          tournament_id: id,
          phase: m.phase,
          bracket_position: m.bracketPosition,
          pair_a_id: m.pairAId,
          pair_b_id: m.pairBId,
        }))
      );
      if (me) throw me;

      toast.success("Chaveamento gerado com sucesso!");
      router.push(`/torneios/${id}/eliminatorias`);
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const suggestedPhase = suggestStartingPhase(pairs.length);
  const activeDraggedPlayer = activeDragId
    ? allOverall.find((p) => `player-${p.playerId}` === activeDragId)
    : null;

  return (
    <div className="space-y-6 pb-20">
      <TournamentStepper tournamentId={id} currentStatus={tournamentStatus} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Classificação & Duplas</span>
            <Sparkles className="w-5 h-5 text-brand" />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arrastre os atletas para ajustar as duplas do mata-mata ou resolver empates.
          </p>
        </div>

        {/* Config: classificados por grupo */}
        <div className="flex items-center gap-3 bg-card p-2 px-3 rounded-lg border border-border shadow-xs">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Classificados / grupo:
          </label>
          <input
            type="number"
            min={1}
            max={5}
            value={numClassifica}
            onChange={(e) =>
              handleNumClassificaChange(
                Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1))
              )
            }
            className="w-12 h-9 border rounded-md text-center text-sm font-bold bg-background focus:ring-2 focus:ring-brand"
            inputMode="numeric"
          />
          <Badge variant="secondary" className="text-xs font-mono font-medium">
            {pairs.length} dupla{pairs.length !== 1 ? "s" : ""} (
            {suggestedPhase ? `Início nas ${suggestedPhase}` : "Inválido"})
          </Badge>
        </div>
      </div>

      {/* Alerta de Empate Técnico se houver */}
      {tiedGroups.length > 0 && (
        <div className="bg-warning-light/60 border border-warning/60 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-warning-foreground">
              Empate Técnico Detectado ({tiedGroups.length})
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atletas com pontuação, saldo e games idênticos na zona de corte. Arraste ou use o botão
              &quot;Trocar&quot; para definir a preferência manual antes de gerar a chave.
            </p>
          </div>
        </div>
      )}

      {/* TABS: CLASSIFICADOS VS ELIMINADOS */}
      <Tabs defaultValue="classificados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60 p-1">
          <TabsTrigger
            value="classificados"
            className="h-10 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Classificados ({classifiedList.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="eliminados"
            className="h-10 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Fase de Grupos / Eliminados ({eliminatedList.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classificados */}
        <TabsContent value="classificados" className="mt-4 space-y-6">
          {/* DnD Context for Pairs */}
          <DndContext
            id={dndContextId}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">
                  Duplas para as Eliminatórias ({pairs.length})
                </h2>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Segure e arraste um atleta para outra dupla
                </span>
              </div>

              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {pairs.map((pair, i) => (
                  <DroppablePairCard
                    key={i}
                    pairIdx={i}
                    pair={pair}
                    isAdmin={isAdmin}
                    editingSlot={editingSlot}
                    onStartEdit={(slot) => setEditingSlot({ pairIdx: i, slot })}
                    onCancelEdit={() => setEditingSlot(null)}
                    onSelectSwap={(slot, targetId) => swapSlotWithTarget(i, slot, targetId)}
                    allClassified={classifiedList}
                    activeId={activeDragId}
                  />
                ))}
              </div>
            </div>

            {/* Drag Overlay during flight */}
            <DragOverlay>
              {activeDraggedPlayer ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-brand bg-card shadow-2xl scale-105 opacity-95">
                  <PlayerAvatar name={activeDraggedPlayer.playerName} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {activeDraggedPlayer.playerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gr. {activeDraggedPlayer.groupNumber} · {activeDraggedPlayer.wins}V
                    </p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Tab 2: Eliminados */}
        <TabsContent value="eliminados" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span>Atletas não classificados na fase de grupos</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Blindados de inserção no mata-mata
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 overflow-x-auto">
              {eliminatedList.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Todos os atletas inscritos estão classificados.
                </p>
              ) : (
                <table className="w-full text-xs min-w-[360px]">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-1 w-8">#</th>
                      <th className="text-left py-2">Atleta</th>
                      <th className="text-center py-2 px-1">Grupo</th>
                      <th className="text-center py-2 px-1">Vitórias</th>
                      <th className="text-center py-2 px-1">Saldo</th>
                      <th className="text-right py-2 pl-1">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eliminatedList.map((s) => (
                      <tr key={s.playerId} className="border-b last:border-0 opacity-75">
                        <td className="py-2 text-muted-foreground font-mono">{s.position}</td>
                        <td className="py-2 font-medium flex items-center gap-2">
                          <PlayerAvatar name={s.playerName} size="xs" />
                          <span>{s.playerName}</span>
                        </td>
                        <td className="py-2 text-center text-muted-foreground">{s.groupNumber}</td>
                        <td className="py-2 text-center">{s.wins}</td>
                        <td
                          className={`py-2 text-center font-medium ${
                            s.saldo >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {s.saldo > 0 ? `+${s.saldo}` : s.saldo}
                        </td>
                        <td className="py-2 text-right font-bold">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action CTA: Gerar Eliminatórias */}
      {isAdmin && (
        <div className="pt-2">
          <Button
            className="w-full bg-brand hover:bg-brand-hover text-white h-12 text-base font-semibold shadow-md active:scale-[0.99] cursor-pointer"
            disabled={pairs.length < 2 || !suggestedPhase || generating}
            onClick={generateKnockout}
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Gerando Chaveamento…</span>
              </>
            ) : (
              <span>Confirmar Duplas e Gerar Eliminatórias →</span>
            )}
          </Button>
        </div>
      )}

      <EditPlayerDialog
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
