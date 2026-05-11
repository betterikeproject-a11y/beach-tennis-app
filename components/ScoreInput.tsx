"use client";

import { useRef, ChangeEvent } from "react";
import { isValidScore } from "@/lib/domain/matches";

type Props = {
  scoreA: number | null;
  scoreB: number | null;
  onChange: (a: number | null, b: number | null) => void;
  disabled?: boolean;
};

export function ScoreInput({ scoreA, scoreB, onChange, disabled }: Props) {
  const bRef = useRef<HTMLInputElement>(null);

  const bothSet = scoreA !== null && scoreB !== null;
  const valid = bothSet ? isValidScore(scoreA!, scoreB!) : true;

  function handleA(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
    if (v !== null && (v < 0 || v > 7)) return;
    onChange(v, scoreB);
    if (v !== null && String(v).length === 1 && bRef.current) {
      bRef.current.focus();
      bRef.current.select();
    }
  }

  function handleB(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
    if (v !== null && (v < 0 || v > 7)) return;
    onChange(scoreA, v);
  }

  const inputClass =
    "w-12 h-12 text-center text-lg font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white disabled:bg-gray-100";
  const errorClass = !valid && bothSet ? "border-red-400" : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={7}
          value={scoreA ?? ""}
          onChange={handleA}
          disabled={disabled}
          className={`${inputClass} ${errorClass}`}
          placeholder="–"
        />
        <span className="text-muted-foreground font-medium">×</span>
        <input
          ref={bRef}
          type="number"
          inputMode="numeric"
          min={0}
          max={7}
          value={scoreB ?? ""}
          onChange={handleB}
          disabled={disabled}
          className={`${inputClass} ${errorClass}`}
          placeholder="–"
        />
      </div>
      {!valid && bothSet && (
        <p className="text-xs text-red-500">Placar inválido</p>
      )}
    </div>
  );
}
