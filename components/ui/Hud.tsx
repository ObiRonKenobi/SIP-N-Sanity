"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store";
import { IconSanity, IconCsat, IconQueue } from "@/components/ui/PixelIcons";

function Meter({
  label,
  value,
  color,
  icon,
  max = 100,
  dangerBelow,
  dangerAbove,
}: {
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
  max?: number;
  dangerBelow?: number;
  dangerAbove?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const danger =
    (dangerBelow !== undefined && value <= dangerBelow) ||
    (dangerAbove !== undefined && value >= dangerAbove);

  return (
    <div className={`min-w-[100px] sm:min-w-[120px] ${danger ? "meter-danger" : ""}`}>
      <div className="mb-0.5 flex items-center justify-between gap-1 font-pixel text-[9px] text-slate-200 sm:text-[10px]">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <motion.span
          key={Math.round(value)}
          initial={{ scale: 1.35, color: "#fff" }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          {Math.round(value)}
        </motion.span>
      </div>
      <div className="h-2.5 border-2 border-slate-700 bg-[#0d1520] sm:h-3">
        <div
          className="meter-fill h-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Hud() {
  const sanity = useGameStore((s) => s.sanity);
  const csat = useGameStore((s) => s.csat);
  const queue = useGameStore((s) => s.queue);
  const clockLabel = useGameStore((s) => s.clockLabel);
  const currentPhase = useGameStore((s) => s.currentPhase);

  const [timePart, meridiem] = clockLabel.split(" ");
  const [h, m] = (timePart || "").split(":");

  return (
    <header className="pixel-frame flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-4 border-[#0b1220] bg-[#152033]/95 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      <div className="min-w-0">
        <h1 className="anim-title-glitch font-pixel text-sm tracking-wide text-amber-300 sm:text-base">
          SIP-N-Sanity
        </h1>
        <p className="font-mono text-[10px] text-sky-300/90 sm:text-xs">
          Please Hold
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Meter
          label="SANITY"
          value={sanity}
          color="#3ecf8e"
          icon={<IconSanity />}
          dangerBelow={25}
        />
        <Meter
          label="CSAT"
          value={csat}
          color="#5eb1ff"
          icon={<IconCsat />}
          dangerBelow={30}
        />
        <Meter
          label="QUEUE"
          value={queue}
          color="#e85d4c"
          icon={<IconQueue />}
          max={100}
          dangerAbove={75}
        />
      </div>
      <div className="text-right">
        <div className="font-pixel text-xs text-amber-200 tabular-nums sm:text-sm">
          {h}
          <span className="inline-block w-2 text-center opacity-90 animate-pulse">
            :
          </span>
          {m} {meridiem}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
          {currentPhase}
        </div>
      </div>
    </header>
  );
}
