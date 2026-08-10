"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { SPRITES } from "@/lib/sprites";
import demoLayout from "@/data/demo-layout.json";

type Pos = { x: number; y: number };
type Facing = "front" | "back" | "left" | "right";

const DESK_SRC: Record<string, string> = {
  deskHero: SPRITES.deskHero,
  deskSanta: SPRITES.deskSanta,
  deskRegular: SPRITES.deskRegular,
  deskManager: SPRITES.deskManager,
};

/**
 * Website demo: walk the office as the hero, find the breakroom,
 * end on coffee-break sprite + short pitch.
 */
export function DemoWalk() {
  const [scene, setScene] = useState<"office" | "breakroom">("office");
  const [player, setPlayer] = useState<Pos>(demoLayout.playerStart);
  const [facing, setFacing] = useState<Facing>("back");
  const [walkFrame, setWalkFrame] = useState<"idle" | "walk1" | "walk2">(
    "idle",
  );
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState(false);
  const entered = useRef(false);
  const movingRef = useRef(false);
  const frameToggle = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        if (!entered.current) setShowHint(true);
      },
      demoLayout.hintDelayMs,
    );
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(k)
      ) {
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
    if (entered.current || scene !== "office") return;
    let dx = 0;
    let dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;
    movingRef.current = dx !== 0 || dy !== 0;
    if (dy < 0) setFacing("back");
    else if (dy > 0) setFacing("front");
    else if (dx < 0) setFacing("left");
    else if (dx > 0) setFacing("right");
    if (!movingRef.current) return;
    const speed = demoLayout.playerSpeed;
    setPlayer((p) => ({
      x: Math.max(8, Math.min(92, p.x + dx * speed)),
      y: Math.max(28, Math.min(88, p.y + dy * speed)),
    }));
  }, [keys, scene]);

  useEffect(() => {
    if (scene !== "office") return;
    const id = window.setInterval(movePlayer, 50);
    return () => window.clearInterval(id);
  }, [movePlayer, scene]);

  useEffect(() => {
    if (scene !== "office") return;
    const id = window.setInterval(() => {
      if (!movingRef.current) {
        setWalkFrame("idle");
        return;
      }
      frameToggle.current = !frameToggle.current;
      setWalkFrame(frameToggle.current ? "walk1" : "walk2");
    }, 140);
    return () => window.clearInterval(id);
  }, [scene]);

  useEffect(() => {
    if (entered.current || scene !== "office") return;
    const br = demoLayout.breakroom;
    if (
      player.x >= br.x &&
      player.x <= br.x + br.w &&
      player.y >= br.y &&
      player.y <= br.y + br.h
    ) {
      entered.current = true;
      setShowHint(false);
      setScene("breakroom");
    }
  }, [player, scene]);

  const playerSrc = useMemo(
    () => SPRITES.playerStand(facing, walkFrame),
    [facing, walkFrame],
  );

  const sortedDesks = useMemo(
    () => [...demoLayout.desks].sort((a, b) => a.y - b.y),
    [],
  );

  if (scene === "breakroom") {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d1520]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SpriteImg
            src={SPRITES.breakroomIso}
            alt="Break room"
            className="absolute inset-0 h-full w-full object-contain"
            fallback={
              <div className="absolute inset-0 bg-gradient-to-b from-[#3a516e] to-[#1a2740]" />
            }
          />
          <div className="absolute bottom-[12%] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
            <SpriteImg
              src={SPRITES.playerCoffeeBreak}
              alt="Coffee break"
              className="h-36 w-auto object-contain drop-shadow-lg"
            />
          </div>
        </div>
        <div className="z-20 shrink-0 border-t-2 border-[#0b1220] bg-[#152033]/95 px-4 py-4 backdrop-blur-sm">
          <h2 className="mb-2 font-pixel text-sm text-amber-300">
            SIP-N-Sanity — Demo complete
          </h2>
          <p className="mb-3 max-w-2xl font-mono text-xs leading-relaxed text-slate-300">
            You survived long enough to find the break room. The full game is a
            9-to-5 VoIP support shift: balance Sanity, CSAT, and the ticket
            queue, dodge bathroom luck, lunch sneak, typing outages, the Office
            Witch, and one coworker who is definitely Santa (nobody mentions
            it). More desks, clones, and chaos coming soon.
          </p>
          <Link
            href="/"
            className="pixel-btn inline-block bg-amber-400 px-5 py-2 font-pixel text-[10px] text-[#1a2332] hover:bg-amber-300"
          >
            Back to title
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#121c2c]">
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

        {sortedDesks.map((d) => (
          <div
            key={d.id}
            className="pointer-events-none absolute"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.w}%`,
              height: `${d.h}%`,
              transform: "translate(-50%, -50%)",
              zIndex: Math.round(d.y),
            }}
          >
            <SpriteImg
              src={DESK_SRC[d.sprite] ?? SPRITES.deskRegular}
              className="h-full w-full object-contain"
              fallback={
                <div className="h-full w-full border-2 border-[#0b1220] bg-[#6b4f2e]/90" />
              }
            />
          </div>
        ))}

        {/* Breakroom door zone (subtle) */}
        <div
          className="pointer-events-none absolute z-[1] border border-dashed border-emerald-400/35 bg-emerald-400/5"
          style={{
            left: `${demoLayout.breakroom.x}%`,
            top: `${demoLayout.breakroom.y}%`,
            width: `${demoLayout.breakroom.w}%`,
            height: `${demoLayout.breakroom.h}%`,
          }}
        />

        {showHint && (
          <div
            className="anim-demo-arrow pointer-events-none absolute z-[6]"
            style={{
              left: `${demoLayout.hintArrow.x}%`,
              top: `${demoLayout.hintArrow.y}%`,
              transform: "translate(-50%, -50%) rotate(-25deg)",
            }}
            aria-hidden
          >
            <div
              className="h-0 w-0 border-y-[14px] border-y-transparent border-l-[28px] border-l-red-500"
              style={{ filter: "drop-shadow(0 0 4px #f00)" }}
            />
          </div>
        )}

        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
            transform: "translate(-50%, -85%)",
            zIndex: Math.round(player.y) + 1,
          }}
        >
          <SpriteImg
            src={playerSrc}
            className="h-14 w-auto object-contain"
            fallback={
              <div className="pixel-sprite h-12 w-9 border-2 border-[#0b1220] bg-[#3d6ea8]">
                <div className="mx-auto mt-0.5 h-3 w-6 bg-[#e8c4a0]" />
              </div>
            }
          />
        </div>
      </div>

      <div className="shrink-0 border-t-2 border-[#0b1220] bg-[#152033] px-3 py-2">
        <p className="font-pixel text-[10px] text-amber-200">
          Walk around the Livetel floor. Find the break room.
        </p>
        <p className="font-mono text-[9px] text-slate-500">
          WASD / arrows · Demo mode ·{" "}
          <Link href="/" className="text-sky-400 underline">
            Title
          </Link>
        </p>
      </div>
    </div>
  );
}
