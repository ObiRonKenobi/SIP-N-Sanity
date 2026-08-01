"use client";

import { useGameStore, type EndingKind } from "@/store";

const TITLES: Record<EndingKind, string> = {
  won: "You Survived",
  sanity: "Mental Outage",
  csat: "CSAT Catastrophe",
  queue: "Queue Apocalypse",
};

export function EndScreen() {
  const phase = useGameStore((s) => s.currentPhase);
  const loseReason = useGameStore((s) => s.loseReason);
  const endingKind = useGameStore((s) => s.endingKind);
  const resetGame = useGameStore((s) => s.resetGame);
  const startDay = useGameStore((s) => s.startDay);

  if (phase !== "won" && phase !== "lost") return null;

  const won = phase === "won";
  const title =
    (endingKind && TITLES[endingKind]) || (won ? "You Survived" : "Game Over");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div
        className={`pixel-frame max-w-lg border-4 bg-[#152033] p-6 text-center shadow-[10px_10px_0_#0b1220] ${
          won ? "border-amber-400" : "border-rose-500"
        }`}
      >
        <h2
          className={`font-pixel text-lg mb-3 ${
            won ? "text-amber-300" : "text-rose-300"
          }`}
        >
          {title}
        </h2>
        <p className="font-mono text-sm text-slate-200 mb-6">{loseReason}</p>
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
