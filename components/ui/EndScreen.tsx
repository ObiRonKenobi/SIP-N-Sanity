"use client";

import { useGameStore } from "@/store";

export function EndScreen() {
  const phase = useGameStore((s) => s.currentPhase);
  const loseReason = useGameStore((s) => s.loseReason);
  const resetGame = useGameStore((s) => s.resetGame);
  const startDay = useGameStore((s) => s.startDay);

  if (phase !== "won" && phase !== "lost") return null;

  const won = phase === "won";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="pixel-frame max-w-lg border-4 border-amber-400 bg-[#152033] p-6 text-center shadow-[10px_10px_0_#0b1220]">
        <h2 className="font-pixel text-lg text-amber-300 mb-3">
          {won ? "You Survived" : "Game Over"}
        </h2>
        <p className="font-mono text-sm text-slate-200 mb-6">
          {won
            ? "5:00 PM. You clock out with a thousand-yard stare and a lukewarm coffee. Victory."
            : loseReason}
        </p>
        <button
          type="button"
          className="pixel-btn bg-amber-400 text-[#1a2332] hover:bg-amber-300"
          onClick={() => {
            resetGame();
            startDay();
          }}
        >
          New Shift
        </button>
      </div>
    </div>
  );
}
