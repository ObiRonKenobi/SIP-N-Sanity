"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { SPRITES } from "@/lib/sprites";
import lunchLayout from "@/data/lunch-iso-layout.json";

type Pos = { x: number; y: number }; // percent of stage 0–100

type Walker = {
  id: string;
  label: string;
  color: string;
  pos: Pos;
  path: Pos[];
  pathIndex: number;
  talkRadius: number;
};

function dist(a: Pos, b: Pos) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function stepToward(from: Pos, to: Pos, speed: number): Pos {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d <= speed) return { ...to };
  return { x: from.x + (dx / d) * speed, y: from.y + (dy / d) * speed };
}

/**
 * Lunch sneak — same isometric office view as the main game.
 * Coworkers leave desks and wander; reach the breakroom door without
 * getting cornered into a conversation (sanity hit).
 */
export function LunchStealth() {
  const completeLunch = useGameStore((s) => s.completeLunch);
  const [player, setPlayer] = useState<Pos>(lunchLayout.playerStart);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState(
    "Sneak to the breakroom. Don't get pulled into a chat."
  );
  const done = useRef(false);

  const [walkers, setWalkers] = useState<Walker[]>(() =>
    lunchLayout.walkers.map((w) => ({
      ...w,
      pos: { ...w.path[0] },
      pathIndex: 0,
    }))
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        setKeys((prev) => ({ ...prev, [k]: true }));
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      setKeys((prev) => ({ ...prev, [k]: false }));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const movePlayer = useCallback(() => {
    if (done.current) return;
    setPlayer((p) => {
      let { x, y } = p;
      const speed = lunchLayout.playerSpeed;
      if (keys.w || keys.arrowup) y -= speed;
      if (keys.s || keys.arrowdown) y += speed;
      if (keys.a || keys.arrowleft) x -= speed;
      if (keys.d || keys.arrowright) x += speed;
      x = Math.max(8, Math.min(92, x));
      y = Math.max(28, Math.min(88, y));
      return { x, y };
    });
  }, [keys]);

  useEffect(() => {
    const id = window.setInterval(movePlayer, 50);
    return () => window.clearInterval(id);
  }, [movePlayer]);

  // NPC patrol
  useEffect(() => {
    const id = window.setInterval(() => {
      if (done.current) return;
      setWalkers((list) =>
        list.map((w) => {
          const target = w.path[w.pathIndex];
          const next = stepToward(w.pos, target, lunchLayout.npcSpeed);
          let pathIndex = w.pathIndex;
          if (dist(next, target) < 0.4) {
            pathIndex = (w.pathIndex + 1) % w.path.length;
          }
          return { ...w, pos: next, pathIndex };
        })
      );
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  // Win / catch
  useEffect(() => {
    if (done.current) return;
    const br = lunchLayout.breakroom;
    if (
      player.x >= br.x &&
      player.x <= br.x + br.w &&
      player.y >= br.y &&
      player.y <= br.y + br.h
    ) {
      done.current = true;
      setStatus("Breakroom! Sandwich acquired.");
      window.setTimeout(() => completeLunch(true), 700);
      return;
    }
    for (const w of walkers) {
      if (dist(player, w.pos) < w.talkRadius) {
        done.current = true;
        setStatus(`${w.label} cornered you for a "quick question."`);
        window.setTimeout(() => completeLunch(false), 900);
        return;
      }
    }
  }, [player, walkers, completeLunch]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#121c2c]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <SpriteImg
          src={SPRITES.officeIso}
          alt="Office"
          className="absolute inset-0 h-full w-full object-cover"
          fallback={
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, #3a516e 0%, #243652 40%, #1a2740 100%)",
              }}
            />
          }
        />

        {/* Desk footprints (placeholders until furniture sprites) */}
        {lunchLayout.desks.map((d, i) => (
          <div
            key={i}
            className="pointer-events-none absolute z-[2]"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.w}%`,
              height: `${d.h}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <SpriteImg
              src={i % 2 === 0 ? SPRITES.deskIso : SPRITES.deskIsoAlt}
              className="h-full w-full object-contain"
              fallback={
                <div
                  className="h-full w-full border-2 border-[#0b1220] bg-[#6b4f2e]/90"
                  style={{ boxShadow: "2px 3px 0 #3a2a18" }}
                />
              }
            />
          </div>
        ))}

        {/* Breakroom zone hint */}
        <div
          className="pointer-events-none absolute z-[1] border-2 border-dashed border-emerald-400/50 bg-emerald-400/10"
          style={{
            left: `${lunchLayout.breakroom.x}%`,
            top: `${lunchLayout.breakroom.y}%`,
            width: `${lunchLayout.breakroom.w}%`,
            height: `${lunchLayout.breakroom.h}%`,
          }}
        >
          <span className="absolute bottom-0 left-1 font-pixel text-[8px] text-emerald-200">
            BREAKROOM
          </span>
        </div>

        {/* Walkers (got up from desks) */}
        {walkers.map((w) => (
          <div
            key={w.id}
            className="absolute z-[4] flex flex-col items-center"
            style={{
              left: `${w.pos.x}%`,
              top: `${w.pos.y}%`,
              transform: "translate(-50%, -80%)",
            }}
          >
            <div
              className="pixel-sprite h-10 w-8 border-2 border-[#0b1220]"
              style={{ background: w.color }}
              title={w.label}
            >
              <div className="mx-auto mt-0.5 h-2.5 w-5 bg-[#e8c4a0]" />
              {w.id === "tech" && (
                <div className="mx-auto h-1 w-4 bg-slate-900" />
              )}
              {w.id === "santa" && (
                <div className="mx-auto h-1.5 w-6 bg-stone-100" />
              )}
            </div>
            <span className="mt-0.5 rounded bg-black/50 px-1 font-mono text-[7px] text-white">
              {w.label}
            </span>
            {/* talk aura */}
            <div
              className="pointer-events-none absolute rounded-full border border-rose-400/40 bg-rose-400/10"
              style={{
                width: `${w.talkRadius * 2.2}%`,
                height: `${w.talkRadius * 1.4}vh`,
                minWidth: 36,
                minHeight: 24,
                top: "40%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: -1,
              }}
            />
          </div>
        ))}

        {/* Player */}
        <div
          className="absolute z-[5] flex flex-col items-center"
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
            transform: "translate(-50%, -80%)",
          }}
        >
          <SpriteImg
            src={SPRITES.playerDesk("idle")}
            className="h-11 w-8 object-contain"
            fallback={
              <div className="pixel-sprite h-10 w-8 border-2 border-[#0b1220] bg-[#3d6ea8]">
                <div className="mx-auto mt-0.5 h-2.5 w-5 bg-[#e8c4a0]" />
                <div className="mx-auto mt-0.5 h-1 w-4 bg-amber-300" />
              </div>
            }
          />
          <span className="mt-0.5 rounded bg-sky-900/80 px-1 font-mono text-[7px] text-sky-100">
            YOU
          </span>
        </div>
      </div>

      <div className="shrink-0 border-t-2 border-[#0b1220] bg-[#152033] px-3 py-2">
        <p className="font-pixel text-[10px] text-amber-200">{status}</p>
        <p className="font-mono text-[9px] text-slate-500">
          WASD / arrows · Avoid coworkers (they will talk) · Green zone = breakroom
        </p>
      </div>
    </div>
  );
}
