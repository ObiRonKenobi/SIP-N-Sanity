"use client";

import { useGameStore } from "@/store";

export function Santa() {
  const setDialog = useGameStore((s) => s.setDialog);
  const phase = useGameStore((s) => s.currentPhase);

  return (
    <button
      type="button"
      className="absolute right-[18%] top-[28%] z-10 flex flex-col items-center gap-1"
      onClick={() =>
        setDialog({
          title: "Coworker",
          text: "He is a regular employee working off-season.",
          tone: "neutral",
        })
      }
      title="Regular employee"
    >
      <div
        className="pixel-sprite h-14 w-12 bg-gradient-to-b from-rose-700 via-rose-600 to-rose-800 border-2 border-[#0b1220]"
        style={{
          boxShadow: "inset 0 -6px 0 #1a2332, inset 4px 4px 0 rgba(255,255,255,0.15)",
        }}
      >
        <div className="mx-auto mt-1 h-3 w-8 bg-stone-100" />
        <div className="mx-auto mt-1 h-2 w-6 bg-rose-900" />
      </div>
      <span className="font-mono text-[9px] text-slate-300">
        {phase === "bathroom" || phase === "lunch" ? "…" : "Desk"}
      </span>
    </button>
  );
}
