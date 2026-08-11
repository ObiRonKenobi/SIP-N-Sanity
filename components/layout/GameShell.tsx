"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore, TICK_MS } from "@/store";
import { Hud } from "@/components/ui/Hud";
import { TicketPopup } from "@/components/ui/TicketPopup";
import { SmokeBreakButton } from "@/components/ui/SmokeBreakButton";
import { DialogBox } from "@/components/ui/DialogBox";
import { EndScreen } from "@/components/ui/EndScreen";
import { OfficeBackground } from "@/components/office/OfficeBackground";
import { setSfxMuted, playCoffee } from "@/components/ui/sfx";
import { startDemoMusic, setDemoMusicMuted } from "@/components/ui/demoMusic";
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
const SmokeBreakScene = dynamic(
  () =>
    import("@/app/games/smoke-break/SmokeBreakScene").then(
      (m) => m.SmokeBreakScene
    ),
  { ssr: false }
);

export function GameShell() {
  const router = useRouter();
  const phase = useGameStore((s) => s.currentPhase);
  const tick = useGameStore((s) => s.tick);
  const isRunning = useGameStore((s) => s.isRunning);
  const isPaused = useGameStore((s) => s.isPaused);
  const muted = useGameStore((s) => s.muted);
  const dialog = useGameStore((s) => s.dialog);
  const clearDialog = useGameStore((s) => s.clearDialog);
  const finishBathroom = useGameStore((s) => s.finishBathroom);
  const isBathroomTime = useGameStore((s) => s.isBathroomTime);
  const togglePause = useGameStore((s) => s.togglePause);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const drinkCoffee = useGameStore((s) => s.drinkCoffee);
  const coffeeUsesLeft = useGameStore((s) => s.coffeeUsesLeft);

  useEffect(() => {
    setSfxMuted(muted);
    setDemoMusicMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!isRunning || isPaused || phase !== "console") return;
    const id = window.setInterval(() => tick(), TICK_MS);
    return () => window.clearInterval(id);
  }, [isRunning, isPaused, phase, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") togglePause();
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause, toggleMute]);

  if (phase === "idle") {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-x-hidden overflow-y-hidden bg-[#0d1520] p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top, #2a3d55 0%, #0d1520 70%)",
          }}
        />
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="anim-title-glitch mb-2 font-pixel text-3xl text-amber-300">
            SIP-N-Sanity
          </h1>
          <motion.p
            className="mb-4 font-mono text-lg text-sky-300"
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
          <p className="mt-3 font-mono text-[10px] text-slate-500">
            In-shift: P pause · M mute
          </p>
        </motion.div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled
            title="Full shift coming soon"
            aria-disabled="true"
            className="pixel-btn cursor-not-allowed bg-slate-600 px-8 py-3 font-pixel text-sm text-slate-400 opacity-60"
          >
            Clock In
          </button>
          <p className="font-mono text-[9px] text-slate-500">
            Full shift — coming soon
          </p>
          <button
            type="button"
            className="pixel-btn bg-amber-400 px-8 py-3 font-pixel text-sm text-[#1a2332] hover:bg-amber-300"
            style={{ transition: "background-color 80ms ease" }}
            onClick={() => {
              startDemoMusic();
              router.push("/demo");
            }}
          >
            Play demo
          </button>
        </div>
      </div>
    );
  }

  const consoleMode = phase === "console" && !isBathroomTime;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d1520] text-slate-100">
      <Hud />
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3 lg:flex-row">
        <div
          className={`relative min-h-0 min-w-0 overflow-hidden ${
            consoleMode ? "flex-[0.75] lg:flex-1" : "flex-1"
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
          {phase === "smoke" && (
            <div className="absolute inset-0 z-20 overflow-hidden">
              <SmokeBreakScene />
            </div>
          )}
          {isPaused && phase === "console" && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
              <div className="pixel-frame border-4 border-amber-400 bg-[#152033] p-6 text-center">
                <p className="font-pixel text-lg text-amber-300 mb-2">Paused</p>
                <p className="font-mono text-xs text-slate-400 mb-3">
                  Press P to resume
                </p>
                <button
                  type="button"
                  className="pixel-btn bg-amber-400 text-[#1a2332]"
                  onClick={() => togglePause()}
                >
                  Resume
                </button>
              </div>
            </div>
          )}
        </div>

        <aside
          className={`flex min-h-0 w-full flex-col gap-2 ${
            consoleMode
              ? "flex-[1.25] lg:w-[min(420px,38vw)] lg:flex-none"
              : "flex-1 lg:w-[min(420px,38vw)] lg:flex-none"
          }`}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <SmokeBreakButton />
            <button
              type="button"
              className="pixel-btn border-2 border-amber-800/60 bg-[#2a2418] px-2 py-2 font-pixel text-[9px] text-amber-100"
              title="Coffee (+8 sanity, limited)"
              disabled={!consoleMode || isPaused}
              onClick={() => {
                playCoffee();
                drinkCoffee();
              }}
            >
              Coffee ({coffeeUsesLeft})
            </button>
            <button
              type="button"
              className="pixel-btn border-2 border-slate-600 bg-[#1a2740] px-2 py-2 font-pixel text-[9px] text-slate-200"
              onClick={() => togglePause()}
              disabled={phase !== "console"}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              className="pixel-btn border-2 border-slate-600 bg-[#1a2740] px-2 py-2 font-pixel text-[9px] text-slate-200"
              onClick={() => toggleMute()}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {consoleMode ? (
              <TicketPopup />
            ) : (
              <div className="pixel-frame h-full border-4 border-slate-700 bg-[#152033]/80 p-3 font-mono text-sm text-slate-400">
                {phase === "bathroom" &&
                  "Ticket console locked — bathroom break."}
                {phase === "lunch" && "Out to lunch (allegedly)."}
                {phase === "outage" && "MAJOR OUTAGE — type to survive."}
                {phase === "smoke" && "Stepped outside. Please hold."}
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
            if (phase === "bathroom") finishBathroom();
          }}
        />
      )}
      <EndScreen />
    </div>
  );
}
