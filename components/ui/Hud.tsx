"use client";

import { useGameStore } from "@/store";

function Meter({
  label,
  value,
  color,
  max = 100,
}: {
  label: string;
  value: number;
  color: string;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="min-w-[120px]">
      <div className="mb-1 flex justify-between font-pixel text-[10px] text-slate-200">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-3 border-2 border-slate-700 bg-[#0d1520]">
        <div
          className="h-full transition-all duration-300"
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

  return (
    <header className="pixel-frame flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#0b1220] bg-[#152033]/95 px-4 py-3">
      <div>
        <h1 className="font-pixel text-base tracking-wide text-amber-300 sm:text-lg">
          SIP-N-Sanity
        </h1>
        <p className="font-mono text-xs text-sky-300/90">Please Hold</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Meter label="SANITY" value={sanity} color="#3ecf8e" />
        <Meter label="CSAT" value={csat} color="#5eb1ff" />
        <Meter label="QUEUE" value={queue} color="#e85d4c" max={100} />
      </div>
      <div className="text-right">
        <div className="font-pixel text-sm text-amber-200">{clockLabel}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          {currentPhase}
        </div>
      </div>
    </header>
  );
}
