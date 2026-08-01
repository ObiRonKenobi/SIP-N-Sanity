"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store";

type Variant = "agent" | "player" | "santa";

/** Placeholder isometric-ish desk + agent. Swap for sprite sheet later. */

export function DeskWorker({
  index,
  active,
  variant = "agent",
  label,
}: {
  index: number;
  active: boolean;
  variant?: Variant;
  label?: string;
}) {
  const setDialog = useGameStore((s) => s.setDialog);
  const phase = useGameStore((s) => s.currentPhase);

  const bobClass =
    active && index % 2 === 0
      ? "anim-bob"
      : active
        ? "anim-bob-delayed"
        : "";

  const isSanta = variant === "santa";
  const isPlayer = variant === "player";

  const body = (
    <>
      <div className={`relative z-[2] mb-[-6px] ${bobClass}`}>
        {isSanta ? (
          <div className="pixel-sprite relative h-11 w-9 border-2 border-[#0b1220] bg-[#b91c1c]">
            <div className="absolute bottom-0.5 left-0.5 right-0.5 h-3.5 bg-stone-100" />
            <div className="absolute left-1.5 top-2.5 h-3 w-6 bg-[#e8c4a0]" />
            <div className="absolute left-0 top-1.5 h-1 w-full bg-stone-100" />
            <div className="absolute -top-0.5 left-0.5 right-0.5 h-2.5 bg-[#b91c1c]" />
            <div className="absolute -top-1.5 right-0.5 h-1.5 w-1.5 bg-stone-100" />
            <div className="absolute -left-1 top-2 h-3 w-1.5 bg-slate-800" />
            <div className="absolute -right-0.5 top-3 h-0.5 w-2 bg-slate-400" />
            {active && (
              <>
                <motion.div
                  className="absolute -bottom-0.5 left-1.5 h-1 w-1.5 bg-[#e8c4a0]"
                  animate={{ x: [0, 2, 0] }}
                  transition={{ repeat: Infinity, duration: 0.45 }}
                />
                <motion.div
                  className="absolute -bottom-0.5 right-1.5 h-1 w-1.5 bg-[#e8c4a0]"
                  animate={{ x: [0, -2, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.45,
                    delay: 0.12,
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <div
            className={`pixel-sprite relative h-10 w-8 border-2 border-[#0b1220] ${
              isPlayer ? "bg-[#3d6ea8]" : "bg-[#5a6b7c]"
            }`}
          >
            <div className="mx-auto mt-0.5 h-2.5 w-5 bg-[#e8c4a0]" />
            <div
              className={`mx-auto mt-0.5 h-1 w-4 ${
                isPlayer ? "bg-amber-300" : "bg-slate-300"
              }`}
            />
            <div className="absolute -left-1 top-2 h-3 w-1.5 bg-slate-800" />
            <div className="absolute -right-0.5 top-3 h-0.5 w-2 bg-slate-400" />
          </div>
        )}
      </div>
      <div
        className="pixel-sprite relative z-[1] h-14 w-full border-2 border-[#0b1220] bg-[#6b4f2e]"
        style={{ boxShadow: "0 6px 0 #3a2a18" }}
      >
        <div className="absolute left-1/2 top-1 h-7 w-10 -translate-x-1/2 border-2 border-slate-800 bg-[#0a1410]">
          <div
            className={`m-0.5 h-2 w-6 ${active ? "anim-crt bg-emerald-400/80" : "bg-emerald-900"}`}
          />
          <div
            className={`mx-0.5 mt-0.5 h-1 w-4 ${active ? "anim-crt bg-emerald-500/50" : "bg-emerald-950"}`}
            style={{ animationDelay: "0.3s" }}
          />
        </div>
        <div className="absolute bottom-1 right-1 h-2 w-2 border border-[#0b1220] bg-stone-200">
          <div className="absolute -right-1 top-0.5 h-1 w-1 border border-[#0b1220]" />
        </div>
      </div>
      <span className="mt-1 font-mono text-[8px] text-slate-400">
        {label ??
          (isSanta
            ? phase === "bathroom" || phase === "lunch"
              ? "…"
              : "T1-??"
            : isPlayer
              ? "YOU"
              : `T1-${index + 1}`)}
      </span>
    </>
  );

  const shellClass =
    "relative flex w-[22%] min-w-[72px] max-w-[110px] flex-col items-center";

  if (isSanta) {
    return (
      <button
        type="button"
        className={`${shellClass} cursor-pointer`}
        title="Regular employee"
        onClick={() =>
          setDialog({
            title: "Coworker",
            text: "He is a regular employee working off-season.",
            tone: "neutral",
          })
        }
      >
        {body}
      </button>
    );
  }

  return <div className={shellClass}>{body}</div>;
}
