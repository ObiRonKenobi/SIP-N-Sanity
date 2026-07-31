"use client";

import { useGameStore } from "@/store";
import { playSipRing, playKeyClack } from "@/components/ui/sfx";

export function TicketPopup() {
  const ticket = useGameStore((s) => s.activeTicket);
  const phase = useGameStore((s) => s.currentPhase);
  const answerTicket = useGameStore((s) => s.answerTicket);
  const isBathroomTime = useGameStore((s) => s.isBathroomTime);

  if (phase !== "console" || !ticket || isBathroomTime) return null;

  return (
    <div className="pixel-frame border-4 border-amber-500/50 bg-[#1a2740] p-4 shadow-[8px_8px_0_#0b1220]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-pixel text-[10px] text-rose-300">
          INCOMING · {ticket.ticketID}
        </span>
        <button
          type="button"
          className="font-mono text-[10px] text-slate-400 hover:text-amber-200"
          onClick={() => playSipRing()}
          aria-label="Play ringtone"
        >
          ♪ SIP
        </button>
      </div>
      <p className="mb-1 font-mono text-xs text-sky-200">{ticket.callerName}</p>
      <p className="mb-4 font-mono text-sm text-slate-100">{ticket.problem}</p>
      <div className="flex flex-col gap-2">
        {ticket.answers.map((answer, i) => (
          <button
            key={i}
            type="button"
            className="pixel-btn bg-[#243652] text-left text-slate-100 hover:bg-[#2f4668]"
            onClick={() => {
              playKeyClack();
              answerTicket(i);
            }}
          >
            {answer.text}
          </button>
        ))}
      </div>
    </div>
  );
}
