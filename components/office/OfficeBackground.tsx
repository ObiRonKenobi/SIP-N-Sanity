"use client";

import { DeskWorker } from "./DeskWorker";

const DUST = [
  { left: "12%", delay: "0s", bottom: "20%" },
  { left: "34%", delay: "1.2s", bottom: "35%" },
  { left: "58%", delay: "2.4s", bottom: "18%" },
  { left: "72%", delay: "0.6s", bottom: "42%" },
  { left: "88%", delay: "1.8s", bottom: "28%" },
];

/** Top row (farther from camera): coworkers + Santa in a place. Bottom: you + front row. */
const TOP_ROW: { variant: "agent" | "santa"; label?: string }[] = [
  { variant: "agent" },
  { variant: "santa" },
  { variant: "agent" },
  { variant: "agent" },
];

const BOTTOM_ROW: { variant: "agent" | "player" }[] = [
  { variant: "agent" },
  { variant: "player" },
  { variant: "agent" },
  { variant: "agent" },
];

export function OfficeBackground({ muted = false }: { muted?: boolean }) {
  return (
    <div
      className={`office-scanlines relative h-full min-h-0 w-full overflow-hidden border-4 border-[#0b1220] transition-[filter,opacity] duration-500 ${
        muted ? "opacity-35 grayscale" : ""
      }`}
      style={{
        background: `
          linear-gradient(180deg, #3a516e 0%, #243652 38%, #1a2740 70%, #121c2c 100%)
        `,
        imageRendering: "pixelated",
      }}
    >
      {/* carpet */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, #1e3050 0 16px, #243a5c 16px 32px),
            repeating-linear-gradient(90deg, transparent 0 31px, rgba(0,0,0,0.15) 31px 32px)
          `,
        }}
      />

      {/* windows */}
      <div className="absolute left-4 top-3 z-[1] grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="window-light h-14 w-14 border-4 border-[#4a6280] bg-gradient-to-b from-sky-200/50 via-amber-100/25 to-amber-900/10"
            style={{ animationDelay: `${i * 0.8}s` }}
          >
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#4a6280]/80" />
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-[#4a6280]/80" />
          </div>
        ))}
      </div>

      <div className="absolute left-0 right-0 top-[76px] z-[1] h-2 bg-[#5c4030]" />

      {!muted &&
        DUST.map((d, i) => (
          <span
            key={i}
            className="dust-mote z-[2]"
            style={{ left: d.left, bottom: d.bottom, animationDelay: d.delay }}
          />
        ))}

      {/* two desk rows — Santa sits in the back (top) row */}
      <div className="absolute inset-x-2 bottom-[6%] top-[22%] z-[3] flex flex-col justify-end gap-[4%]">
        <div className="flex max-h-[46%] scale-[0.92] justify-around gap-1 opacity-95 origin-bottom">
          {TOP_ROW.map((seat, i) => (
            <DeskWorker
              key={`top-${i}`}
              index={i}
              active={!muted}
              variant={seat.variant}
              label={seat.label}
            />
          ))}
        </div>
        <div className="flex max-h-[50%] justify-around gap-1">
          {BOTTOM_ROW.map((seat, i) => (
            <DeskWorker
              key={`bot-${i}`}
              index={i + 4}
              active={!muted}
              variant={seat.variant}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-[6] font-mono text-[9px] text-slate-400">
        Floor 3 · VoIP Support
      </div>
    </div>
  );
}
