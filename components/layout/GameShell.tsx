"use client";

import { useEffect } from "react";
import { useGameStore, TICK_MS } from "@/store";
import { Hud } from "@/components/ui/Hud";
import { TicketPopup } from "@/components/ui/TicketPopup";
import { SmokeBreakButton } from "@/components/ui/SmokeBreakButton";
import { DialogBox } from "@/components/ui/DialogBox";
import { EndScreen } from "@/components/ui/EndScreen";
import { OfficeBackground } from "@/components/office/OfficeBackground";
import dynamic from "next/dynamic";

const BathroomGamble = dynamic(
  () =>
    import("@/app/games/bathroom-gamble/BathroomGamble").then(
      (m) => m.BathroomGamble
    ),
  { ssr: false }
);
const LunchStealth = dynamic(
  () =>
    import("@/app/games/lunch-stealth/LunchStealth").then((m) => m.LunchStealth),
  { ssr: false }
);
const TypingOutage = dynamic(
  () =>
    import("@/app/games/typing-outage/TypingOutage").then(
      (m) => m.TypingOutage
    ),
  { ssr: false }
);

export function GameShell() {
  const phase = useGameStore((s) => s.currentPhase);
  const tick = useGameStore((s) => s.tick);
  const isRunning = useGameStore((s) => s.isRunning);
  const startDay = useGameStore((s) => s.startDay);
  const dialog = useGameStore((s) => s.dialog);
  const clearDialog = useGameStore((s) => s.clearDialog);
  const isBathroomTime = useGameStore((s) => s.isBathroomTime);

  useEffect(() => {
    if (!isRunning || phase !== "console") return;
    const id = window.setInterval(() => tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [isRunning, phase, tick]);

  if (phase === "idle") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_top,#2a3d55,#0d1520)] p-6">
        <div className="text-center">
          <h1 className="font-pixel text-3xl text-amber-300 mb-2">
            SIP-N-Sanity
          </h1>
          <p className="font-mono text-lg text-sky-300 mb-4">Please Hold</p>
          <p className="mx-auto max-w-md font-mono text-sm text-slate-300">
            Tier 1 VoIP support. Balance Sanity, CSAT, and the Queue from 9 to 5.
            Bathroom luck, lunch stealth, typing outages, and one terrible idea
            involving a cigarette.
          </p>
        </div>
        <button
          type="button"
          className="pixel-btn bg-amber-400 px-8 py-3 font-pixel text-sm text-[#1a2332] hover:bg-amber-300"
          onClick={() => startDay()}
        >
          Clock In
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1520] text-slate-100">
      <Hud />
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="relative flex-1">
          <OfficeBackground muted={phase !== "console" || isBathroomTime} />
          {phase === "bathroom" && (
            <div className="absolute inset-0 z-20">
              <BathroomGamble />
            </div>
          )}
          {phase === "lunch" && (
            <div className="absolute inset-0 z-20 bg-[#0d1520]">
              <LunchStealth />
            </div>
          )}
          {phase === "outage" && (
            <div className="absolute inset-0 z-20 bg-[#0d1520]">
              <TypingOutage />
            </div>
          )}
        </div>
        <aside className="flex w-full flex-col gap-3 lg:w-[380px]">
          <div className="flex items-center justify-between gap-2">
            <SmokeBreakButton />
            <span className="font-mono text-[10px] text-slate-500">
              1 game min ≈ 1s
            </span>
          </div>
          {phase === "console" && !isBathroomTime ? (
            <TicketPopup />
          ) : (
            <div className="pixel-frame border-4 border-slate-700 bg-[#152033]/80 p-4 font-mono text-sm text-slate-400">
              {phase === "bathroom" && "Ticket console locked — bathroom break."}
              {phase === "lunch" && "Out to lunch (allegedly)."}
              {phase === "outage" && "MAJOR OUTAGE — type to survive."}
              {(phase === "won" || phase === "lost") && "Shift ended."}
            </div>
          )}
          <div className="pixel-frame border-2 border-slate-700 bg-[#121c2c] p-3 font-mono text-[11px] text-slate-400">
            <p>10:30 Bathroom · 12:00 Stealth · 3:00 Outage</p>
            <p className="mt-1">Smoke once. Witch odds are not in your favor.</p>
          </div>
        </aside>
      </div>
      {dialog && (
        <DialogBox
          title={dialog.title}
          text={dialog.text}
          tone={dialog.tone}
          onClose={clearDialog}
        />
      )}
      <EndScreen />
    </div>
  );
}
