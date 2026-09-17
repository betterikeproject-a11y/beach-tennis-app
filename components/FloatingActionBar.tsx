"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionBarProps {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
  icon?: React.ComponentType<{ className?: string }>;
  isPending?: boolean;
}

export function FloatingActionBar({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = ArrowRight,
  isPending: externalPending = false,
}: FloatingActionBarProps) {
  const [internalPending, setInternalPending] = useState(false);
  const loading = externalPending || internalPending;

  async function handleClick() {
    try {
      setInternalPending(true);
      await onAction();
    } finally {
      setInternalPending(false);
    }
  }

  return (
    <aside
      aria-label="Ação rápida recomendada"
      className="fixed bottom-4 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-xl bg-card/95 backdrop-blur-md border-2 border-brand shadow-xl rounded-xl p-3 sm:p-4",
          "flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
        )}
      >
        <div className="text-center sm:text-left min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight flex items-center justify-center sm:justify-start gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-success animate-pulse shrink-0" />
            {title}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>

        <Button
          onClick={handleClick}
          disabled={loading}
          className="w-full sm:w-auto h-11 px-5 bg-brand hover:bg-brand-hover text-white font-semibold shrink-0 cursor-pointer active:scale-[0.99] shadow-xs flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <span>{actionLabel}</span>
              <Icon className="w-4 h-4 shrink-0" />
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
