"use client";

import { SpriteImg } from "@/components/ui/SpriteImg";
import { SPRITES } from "@/lib/sprites";

type Tail = "left" | "right" | "down" | "shout";

const BUBBLE_SRC: Record<Tail, string> = {
  left: SPRITES.bubbleLeft,
  right: SPRITES.bubbleRight,
  down: SPRITES.bubbleDown,
  shout: SPRITES.bubbleShout,
};

/** Reusable comic bubble — frame from sprite (or CSS fallback), text in-engine. */
export function SpeechBubble({
  text,
  tail = "down",
  className = "",
}: {
  text: string;
  tail?: Tail;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none relative z-20 max-w-[140px] ${className}`}
      role="status"
    >
      <SpriteImg
        src={BUBBLE_SRC[tail]}
        alt=""
        className="absolute inset-0 h-full w-full object-fill opacity-90"
        fallback={
          <div
            className={`absolute inset-0 border-2 border-[#0b1220] bg-[#f5f0e6] ${
              tail === "shout" ? "rounded-sm" : "rounded-md"
            }`}
          />
        }
      />
      <p className="relative px-2 py-1.5 font-pixel text-[8px] leading-tight text-[#1a2332]">
        {text}
      </p>
      {/* CSS tail if no sprite */}
      <span
        className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#0b1220] bg-[#f5f0e6]"
        aria-hidden
      />
    </div>
  );
}
