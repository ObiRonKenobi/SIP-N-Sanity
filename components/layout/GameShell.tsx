"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
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
  const finishBathroom = useGameStore((s) => s.finishBathroom);
  const isBathroomTime = useGameStore((s) => s.isBathroomTime);

  useEffect(() => {
    if (!isRunning || phase !== "console") return;
    const id = window.setInterval(() => tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [isRunning, phase, tick]);

  if (phase === "idle") {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(ellipse_at_top,#2a3d55,#0d1520)] p-6">
        <div className="office-scanlines pointer-events-none absolute inset-0 opacity-40" />
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="anim-title-glitch font-pixel text-3xl text-amber-300 mb-2">
            SIP-N-Sanity
          </h1>
          <motion.p
            className="font-mono text-lg text-sky-300 mb-4"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          >
            Please Hold
          </motion.p>
          <p className="mx-auto max-w-md font-mono text-sm text-slate-300">
            Tier 1 VoIP support. Balance Sanity, CSAT, and the Queue from 9 to 5.
            Bathroom luck, lunch stealth, typing outages, and one terrible idea
            involving a cigarette.
          </p>
        </motion.div>
        <motion.button
          type="button"
          className="relative z-10 pixel-btn bg-amber-400 px-8 py-3 font-pixel text-sm text-[#1a2332] hover:bg-amber-300"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ y: { repeat: Infinity, duration: 1.8 } }}
          onClick={() => startDay()}
        >
          Clock In
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d1520] text-slate-100">
      <Hud />
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3 lg:flex-row">
        {/* Stage — office / mini-games (gives console room on short screens) */}
        <div
          className={`relative min-h-0 min-w-0 overflow-hidden ${
            phase === "console" && !isBathroomTime
              ? "flex-[0.75] lg:flex-1"
              : "flex-1"
          }`}
        >
          <OfficeBackground muted={phase !== "console" || isBathroomTime} />
          {phase === "bathroom" && (
            <div className="absolute inset-0 z-20 overflow-hidden">
              <BathroomGamble />
            </div>
          )}
          {phase === "lunch" && (
            <div className="absolute inset-0 z-20 overflow-hidden bg-[#0d1520]">
              <LunchStealth />
            </div>
          )}
          {phase === "outage" && (
            <div className="absolute inset-0 z-20 overflow-hidden bg-[#0d1520]">
              <TypingOutage />
            </div>
          )}
        </div>

        {/* Console — sized so ticket + all answers fit without scrolling */}
        <aside
          className={`flex min-h-0 w-full flex-col gap-2 ${
            phase === "console" && !isBathroomTime
              ? "flex-[1.25] lg:w-[min(420px,38vw)] lg:flex-none"
              : "flex-1 lg:w-[min(420px,38vw)] lg:flex-none"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <SmokeBreakButton />
            <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
              1 game min ≈ 1s
            </span>
          </div>
          <div className="min-h-0 flex-1">
            {phase === "console" && !isBathroomTime ? (
              <TicketPopup />
            ) : (
              <div className="pixel-frame h-full border-4 border-slate-700 bg-[#152033]/80 p-3 font-mono text-sm text-slate-400">
                {phase === "bathroom" &&
                  "Ticket console locked — bathroom break."}
                {phase === "lunch" && "Out to lunch (allegedly)."}
                {phase === "outage" && "MAJOR OUTAGE — type to survive."}
                {(phase === "won" || phase === "lost") && "Shift ended."}
              </div>
            )}
          </div>
        </aside>
      </div>
      {dialog && (
        <DialogBox
          title={dialog.title}
          text={dialog.text}
          tone={dialog.tone}
          onClose={() => {
            clearDialog();
            // Dismissing bathroom result also returns to the desk
            if (phase === "bathroom") finishBathroom();
          }}
        />
      )}
      <EndScreen />
    </div>
  );
}
