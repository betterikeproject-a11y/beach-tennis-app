"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Users, TableProperties, ListOrdered, GitBranch, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentStatus } from "@/lib/types/database";

interface TournamentStepperProps {
  tournamentId: string;
  currentStatus: TournamentStatus;
}

type StepItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  associatedStatus: TournamentStatus | "classificacao";
};

export function TournamentStepper({ tournamentId, currentStatus }: TournamentStepperProps) {
  const pathname = usePathname();

  const steps: StepItem[] = [
    {
      id: "draft",
      label: "1. Atletas",
      href: `/torneios/${tournamentId}`,
      icon: Users,
      associatedStatus: "draft",
    },
    {
      id: "grupos",
      label: "2. Grupos",
      href: `/torneios/${tournamentId}/grupos`,
      icon: TableProperties,
      associatedStatus: "grupos",
    },
    {
      id: "classificacao",
      label: "3. Duplas",
      href: `/torneios/${tournamentId}/classificacao`,
      icon: ListOrdered,
      associatedStatus: "classificacao",
    },
    {
      id: "eliminatorias",
      label: "4. Mata-Mata",
      href: `/torneios/${tournamentId}/eliminatorias`,
      icon: GitBranch,
      associatedStatus: "eliminatorias",
    },
    {
      id: "finalizado",
      label: "5. Pódio",
      href: `/torneios/${tournamentId}`,
      icon: Trophy,
      associatedStatus: "finalizado",
    },
  ];

  // Map status hierarchy to numerical index to calculate progress
  const STATUS_RANK: Record<TournamentStatus | "classificacao", number> = {
    draft: 0,
    grupos: 1,
    classificacao: 2,
    eliminatorias: 3,
    finalizado: 4,
  };

  const currentRank = STATUS_RANK[currentStatus];

  return (
    <nav
      aria-label="Progresso do Torneio"
      className="w-full bg-card rounded-lg border border-border/80 shadow-xs p-1.5 sm:p-2 mb-6"
    >
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isExactActive = pathname === step.href;
          const isCompleted = currentRank > index;
          const isCurrentStatus = currentRank === index;

          return (
            <div key={step.id} className="flex items-center shrink-0 flex-1 min-w-[100px] sm:min-w-0">
              <Link
                href={step.href}
                className={cn(
                  "flex items-center justify-center gap-1.5 w-full h-11 px-2.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer active:scale-[0.99]",
                  isExactActive
                    ? "bg-brand text-white font-semibold shadow-xs"
                    : isCompleted
                    ? "bg-success-light/40 text-success hover:bg-success-light/70"
                    : isCurrentStatus
                    ? "bg-brand-light text-brand hover:bg-brand-light/80 border border-brand/30"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                ) : (
                  <Icon className={cn("w-4 h-4 shrink-0", isExactActive ? "text-white" : "opacity-80")} />
                )}
                <span className="truncate">{step.label}</span>
              </Link>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden lg:block w-3 h-0.5 mx-1 shrink-0 rounded-full",
                    isCompleted ? "bg-success/50" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
