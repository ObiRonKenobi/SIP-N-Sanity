"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store";
import { playSipRing, playKeyClack } from "@/components/ui/sfx";

export function TicketPopup() {
  const ticket = useGameStore((s) => s.activeTicket);
  const phase = useGameStore((s) => s.currentPhase);
  const answerTicket = useGameStore((s) => s.answerTicket);
  const isBathroomTime = useGameStore((s) => s.isBathroomTime);

  const visible = phase === "console" && !!ticket && !isBathroomTime;

  useEffect(() => {
    if (visible && ticket) playSipRing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ticket?.ticketID]);

  return (
    <AnimatePresence mode="wait">
      {visible && ticket && (
        <motion.div
          key={ticket.ticketID + ticket.problem}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          className="pixel-frame anim-ring grid h-full max-h-full grid-rows-[auto_auto_1fr] gap-2 overflow-hidden border-4 border-amber-500/60 bg-[#1a2740] p-2.5 shadow-[6px_6px_0_#0b1220] sm:p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-pixel text-[9px] text-rose-300 sm:text-[10px]">
                INCOMING · {ticket.ticketID}
              </span>
              <p className="truncate font-mono text-[11px] text-sky-200 sm:text-xs">
                {ticket.callerName}
              </p>
            </div>
            <motion.span
              className="shrink-0 font-mono text-[9px] text-amber-300 sm:text-[10px]"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              ♪ RING
            </motion.span>
          </div>

          <p className="font-mono text-[12px] leading-snug text-slate-100 sm:text-sm">
            {ticket.problem}
          </p>

          {/* All answers share remaining height — no scrolling */}
          <div
            className="grid min-h-0 gap-1.5"
            style={{
              gridTemplateRows: `repeat(${ticket.answers.length}, minmax(0, 1fr))`,
            }}
          >
            {ticket.answers.map((answer, i) => (
              <motion.button
                key={i}
                type="button"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.99 }}
                className="pixel-btn flex h-full min-h-0 items-center bg-[#243652] px-2 py-1.5 text-left text-[11px] leading-snug text-slate-100 hover:bg-[#2f4668] sm:text-xs"
                onClick={() => {
                  playKeyClack();
                  answerTicket(i);
                }}
              >
                <span className="line-clamp-3">{answer.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
