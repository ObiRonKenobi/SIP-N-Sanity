"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { SPRITES } from "@/lib/sprites";
import chatter from "@/data/desk-chatter.json";

type Variant = "agent" | "player" | "santa";

const AGENT_IDS = ["agent-a", "agent-b", "agent-c"] as const;

/** Placeholder isometric-ish desk + agent. Swap for sprite sheet later. */

export function DeskWorker({
  index,
  active,
  variant = "agent",
  label,
  chatterId,
}: {
  index: number;
  active: boolean;
  variant?: Variant;
  label?: string;
  chatterId?: string;
}) {
  const setDialog = useGameStore((s) => s.setDialog);
  const phase = useGameStore((s) => s.currentPhase);

  const isSanta = variant === "santa";
  const isPlayer = variant === "player";
  const deskId = useMemo(() => {
    if (chatterId) return chatterId;
    if (isSanta) return "santa";
    if (isPlayer) return "player";
    return AGENT_IDS[index % AGENT_IDS.length];
  }, [chatterId, isSanta, isPlayer, index]);

  const poses = isPlayer
    ? ([
        "idle",
        "type",
        "glance-right",
        "glance-left",
        "glance-right",
        "phone",
      ] as const)
    : isSanta
      ? (["idle", "type", "sip"] as const)
      : (["idle", "type", "stretch"] as const);
  const [poseIdx, setPoseIdx] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setPoseIdx((p) => (p + 1) % poses.length);
    }, 1800 + (index % 3) * 400);
    return () => window.clearInterval(id);
  }, [active, index, poses.length]);

  useEffect(() => {
    if (!active || phase !== "console") {
      setBubble(null);
      return;
    }
    const lines =
      (chatter.quips as Record<string, string[]>)[deskId] ??
      chatter.quips["agent-a"];
    const show = () => {
      const line = lines[Math.floor(Math.random() * lines.length)];
      setBubble(line);
      window.setTimeout(() => setBubble(null), 3200);
    };
    const delay = 4000 + index * 2200 + Math.random() * 3000;
    const first = window.setTimeout(show, delay);
    const loop = window.setInterval(show, 14000 + index * 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, [active, phase, deskId, index]);

  const bobClass =
    active && index % 2 === 0
      ? "anim-bob"
      : active
        ? "anim-bob-delayed"
        : "";

  const pose = poses[poseIdx];
  const spriteSrc = isPlayer
    ? SPRITES.playerDesk(
        pose as
          | "idle"
          | "type"
          | "glance-left"
          | "glance-right"
          | "phone",
      )
    : SPRITES.desk(deskId, pose);

  const placeholderBody = isSanta ? (
    <div className="pixel-sprite relative h-11 w-9 border-2 border-[#0b1220] bg-[#b91c1c]">
      <div className="absolute bottom-0.5 left-0.5 right-0.5 h-3.5 bg-stone-100" />
      <div className="absolute left-1.5 top-2.5 h-3 w-6 bg-[#e8c4a0]" />
      <div className="absolute left-0 top-1.5 h-1 w-full bg-stone-100" />
      <div className="absolute -top-0.5 left-0.5 right-0.5 h-2.5 bg-[#b91c1c]" />
      <div className="absolute -top-1.5 right-0.5 h-1.5 w-1.5 bg-stone-100" />
    </div>
  ) : (
    <div
      className={`pixel-sprite relative h-10 w-8 border-2 border-[#0b1220] ${
        isPlayer ? "bg-[#3d6ea8]" : "bg-[#5a6b7c]"
      }`}
    >
      <div className="mx-auto mt-0.5 h-2.5 w-5 bg-[#e8c4a0]" />
      <div
        className={`mx-auto mt-0.5 h-1 w-4 ${
          isPlayer ? "bg-amber-300" : "bg-slate-300"
        }`}
      />
    </div>
  );

  const body = (
    <>
      <div className={`relative z-[2] mb-[-6px] ${bobClass}`}>
        {bubble && (
          <div className="absolute -top-10 left-1/2 z-30 -translate-x-1/2">
            <SpeechBubble text={bubble} tail="down" />
          </div>
        )}
        <SpriteImg
          src={spriteSrc}
          className="h-11 w-9 object-contain"
          fallback={placeholderBody}
        />
      </div>
      <div
        className="pixel-sprite relative z-[1] h-14 w-full border-2 border-[#0b1220] bg-[#6b4f2e]"
        style={{ boxShadow: "0 6px 0 #3a2a18" }}
      >
        <div className="absolute left-1/2 top-1 h-7 w-10 -translate-x-1/2 border-2 border-slate-800 bg-[#0a1410]">
          <div
            className={`m-0.5 h-2 w-6 ${active ? "anim-crt bg-emerald-400/80" : "bg-emerald-900"}`}
          />
        </div>
      </div>
      <span className="mt-1 font-mono text-[8px] text-slate-400">
        {label ??
          (isSanta
            ? phase === "bathroom" || phase === "lunch"
              ? "…"
              : "T1-??"
            : isPlayer
              ? "YOU"
              : `T1-${index + 1}`)}
      </span>
    </>
  );

  const shellClass =
    "relative flex w-[22%] min-w-[72px] max-w-[110px] flex-col items-center";

  if (isSanta) {
    return (
      <button
        type="button"
        className={`${shellClass} cursor-pointer`}
        title="Regular employee"
        onClick={() =>
          setDialog({
            title: "Coworker",
            text: "He is a regular employee working off-season.",
            tone: "neutral",
          })
        }
      >
        {body}
      </button>
    );
  }

  return <div className={shellClass}>{body}</div>;
}
