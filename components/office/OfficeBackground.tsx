"use client";

import { Santa } from "./Santa";

export function OfficeBackground({ muted = false }: { muted?: boolean }) {
  return (
    <div
      className={`relative h-full min-h-[320px] overflow-hidden border-4 border-[#0b1220] ${
        muted ? "opacity-40 grayscale" : ""
      }`}
      style={{
        background: `
          linear-gradient(180deg, #2a3d55 0%, #1a2740 45%, #121c2c 100%),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 23px,
            rgba(0,0,0,0.08) 23px,
            rgba(0,0,0,0.08) 24px
          )
        `,
        imageRendering: "pixelated",
      }}
    >
      {/* carpet tiles */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#1e3050 0 16px,#243a5c 16px 32px)",
        }}
      />
      {/* windows */}
      <div className="absolute left-4 top-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 w-14 border-4 border-[#3d536e] bg-gradient-to-b from-sky-300/40 to-amber-200/20"
          />
        ))}
      </div>
      {/* desks row */}
      <div className="absolute bottom-10 left-6 right-6 flex justify-around">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-20 border-2 border-[#0b1220] bg-[#6b4f2e]"
            style={{ boxShadow: "0 8px 0 #3a2a18" }}
          >
            <div className="mx-auto mt-2 h-8 w-12 border-2 border-slate-700 bg-[#0d1a14]">
              <div className="m-1 h-2 w-8 bg-emerald-400/70" />
            </div>
          </div>
        ))}
      </div>
      <Santa />
      <div className="absolute bottom-2 left-2 font-mono text-[9px] text-slate-400">
        Floor 3 · VoIP Support
      </div>
    </div>
  );
}
