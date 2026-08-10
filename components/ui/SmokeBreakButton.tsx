"use client";

import { useGameStore } from "@/store";

export function SmokeBreakButton() {
  const hasSmoked = useGameStore((s) => s.hasSmoked);
  const phase = useGameStore((s) => s.currentPhase);
  const isPaused = useGameStore((s) => s.isPaused);
  const takeSmokeBreak = useGameStore((s) => s.takeSmokeBreak);

  const locked =
    hasSmoked ||
    isPaused ||
    phase === "bathroom" ||
    phase === "lunch" ||
    phase === "outage" ||
    phase === "smoke" ||
    phase === "idle";

  return (
    <button
      type="button"
      disabled={locked}
      title={
        hasSmoked
          ? "Already used this shift"
          : "33% bliss / 67% Witch — once per day"
      }
      onClick={() => takeSmokeBreak()}
      className={`pixel-btn flex items-center gap-2 border-2 px-3 py-2 font-pixel text-[10px] ${
        locked
          ? "cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500 opacity-60"
          : "border-amber-600/80 bg-[#3a2a18] text-amber-200 hover:bg-[#4a3520]"
      }`}
    >
      <span
        className="inline-block h-3 w-3 rounded-sm bg-amber-500"
        aria-hidden
      />
      Smoke Break
    </button>
  );
}
