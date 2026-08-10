"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { SPRITES } from "@/lib/sprites";
import { playSmokeWin, playWitchYell } from "@/components/ui/sfx";
import smokeData from "@/data/smoke-outcomes.json";

export function SmokeBreakScene() {
  const smokeOutcome = useGameStore((s) => s.smokeOutcome);
  const finishSmokeBreak = useGameStore((s) => s.finishSmokeBreak);
  const [frame, setFrame] = useState(1 as 1 | 2);
  const [puff, setPuff] = useState(1 as 1 | 2 | 3);
  const [showResult, setShowResult] = useState(false);

  const win = smokeOutcome === "win";

  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame((f) => (f === 1 ? 2 : 1));
      setPuff((p) => ((p % 3) + 1) as 1 | 2 | 3);
    }, 280);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (win) playSmokeWin();
    else playWitchYell();
    const t = window.setTimeout(() => setShowResult(true), 900);
    return () => window.clearTimeout(t);
  }, [win]);

  const outcome = smokeData.smokeBreakOutcomes.find((o) => o.id === (win ? "win" : "lose"));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#87b8e8]">
      {/* Park background */}
      <div className="absolute inset-0">
        <SpriteImg
          src={SPRITES.outdoorPark}
          alt="Outdoor break"
          className="h-full w-full object-cover"
          fallback={
            <div
              className="h-full w-full"
              style={{
                background: `
                  linear-gradient(180deg, #7ec8ff 0%, #b8e0ff 40%, #6fbf6a 40%, #5aa855 100%)
                `,
              }}
            />
          }
        />
        {/* Procedural sunny extras when no art */}
        <div className="pointer-events-none absolute left-[8%] top-[12%] h-16 w-16 rounded-full bg-amber-200/90 shadow-[0_0_40px_#fde68a]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-emerald-700/40 to-transparent" />
        <div className="pointer-events-none absolute left-[18%] top-[28%] h-32 w-40 rounded-full bg-emerald-800/50 blur-[1px]" />
      </div>

      {/* Critters */}
      <motion.div
        className="absolute left-[22%] top-[38%] z-[2]"
        animate={{ x: [0, 12, 0], y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.4 }}
      >
        <SpriteImg
          src={SPRITES.butterfly(frame)}
          className="h-4 w-4"
          fallback={
            <span className="block h-3 w-4 rounded-sm bg-orange-300 border border-[#0b1220]" />
          }
        />
      </motion.div>
      <motion.div
        className="absolute right-[28%] top-[42%] z-[2]"
        animate={{ x: [0, -10, 0], y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
      >
        <SpriteImg
          src={SPRITES.butterfly(frame === 1 ? 2 : 1)}
          className="h-3 w-3"
          fallback={
            <span className="block h-2.5 w-3 rounded-sm bg-sky-200 border border-[#0b1220]" />
          }
        />
      </motion.div>
      <motion.div
        className="absolute bottom-[22%] left-[30%] z-[2]"
        animate={{ x: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <SpriteImg
          src={SPRITES.squirrel(frame)}
          className="h-6 w-6"
          fallback={
            <span className="block h-5 w-6 rounded-sm bg-amber-800 border-2 border-[#0b1220]" />
          }
        />
      </motion.div>

      {/* Player smoke / witch */}
      <div className="relative z-[3] flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="font-pixel text-xs text-[#1a2332] drop-shadow-sm bg-white/50 px-2 py-1">
          Smoke Break — sunny side of the building
        </p>

        {win ? (
          <div className="relative flex flex-col items-center">
            <SpriteImg
              src={SPRITES.puff(puff)}
              className="mb-[-8px] h-10 w-10"
              fallback={
                <div className="mb-1 h-8 w-8 rounded-full bg-slate-300/60 border border-slate-400" />
              }
            />
            <div className="pixel-sprite h-16 w-12 border-2 border-[#0b1220] bg-[#3d6ea8]">
              <div className="mx-auto mt-1 h-3 w-6 bg-[#e8c4a0]" />
              <div className="mx-auto mt-1 h-1 w-4 bg-amber-300" />
            </div>
            <p className="mt-2 font-mono text-[10px] text-emerald-900">
              Fresh air. Questionable choices.
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <SpriteImg
              src={SPRITES.witchOutdoor}
              className="h-28 w-20 object-contain"
              fallback={
                <div className="pixel-sprite flex h-28 w-20 flex-col items-center border-2 border-[#0b1220] bg-[#2a1810]">
                  <div className="mt-2 h-3 w-10 bg-stone-800" />
                  <div className="mt-1 h-4 w-8 bg-[#e8c4a0]" />
                  <div className="mt-1 h-2 w-6 bg-rose-900" />
                  <div className="mt-2 h-10 w-14 bg-stone-700" />
                  <div className="absolute right-0 top-10 h-8 w-1 bg-amber-600" />
                </div>
              }
            />
            <p className="mt-2 font-pixel text-[10px] text-rose-800">
              THE WITCH
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-[4] m-3 pixel-frame border-4 border-[#0b1220] bg-[#152033]/95 p-4"
          >
            <h3
              className={`font-pixel text-sm mb-2 ${
                win ? "text-emerald-300" : "text-orange-300"
              }`}
            >
              {win ? "Smoke Break" : "The Witch Boss"}
            </h3>
            <p className="mb-3 font-mono text-sm text-slate-100">
              {outcome?.text}
            </p>
            <button
              type="button"
              className="pixel-btn w-full bg-amber-400 text-[#1a2332]"
              onClick={() => finishSmokeBreak()}
            >
              Back Inside
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
