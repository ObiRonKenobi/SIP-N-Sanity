"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { useGameStore } from "@/store";
import { playKeyClack } from "@/components/ui/sfx";
import outageWords from "@/data/outage-words.json";

const WORDS = outageWords as string[];

/** Fall speed scale (1 = original). 0.75 = 25% slower. */
const FALL_SPEED_SCALE = 0.75;

type Falling = {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  wobble: number;
  flash?: number;
};

type Burst = { id: number; x: number; y: number; born: number };

const DURATION_MS = 45000;
const TARGET_CLEARS = 12;

export function TypingOutage() {
  const applyEffect = useGameStore((s) => s.applyEffect);
  const completeOutage = useGameStore((s) => s.completeOutage);

  const [width, setWidth] = useState(640);
  const height = 380;
  const [falling, setFalling] = useState<Falling[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [typed, setTyped] = useState("");
  const [cleared, setCleared] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [inboxShake, setInboxShake] = useState(0);
  const idRef = useRef(0);
  const done = useRef(false);
  const fallingRef = useRef(falling);
  fallingRef.current = falling;

  useEffect(() => {
    setWidth(Math.min(720, window.innerWidth - 48));
  }, []);

  useEffect(() => {
    const spawn = window.setInterval(() => {
      if (done.current) return;
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      idRef.current += 1;
      setFalling((list) => [
        ...list,
        {
          id: idRef.current,
          word,
          x: 40 + Math.random() * (width - 160),
          y: -20,
          speed: (0.9 + Math.random() * 0.8) * FALL_SPEED_SCALE,
          wobble: Math.random() * Math.PI * 2,
        },
      ]);
    }, 1400);
    return () => window.clearInterval(spawn);
  }, [width]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 16.67;
      last = now;
      setFalling((list) => {
        const next: Falling[] = [];
        for (const t of list) {
          const y = t.y + t.speed * dt * 1.6;
          if (y > height - 30) {
            applyEffect({ queue: 2 });
            setInboxShake((s) => s + 1);
          } else {
            next.push({
              ...t,
              y,
              wobble: t.wobble + 0.08 * dt,
            });
          }
        }
        return next;
      });
      setBursts((list) => list.filter((b) => now - b.born < 320));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [applyEffect]);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, DURATION_MS - (performance.now() - start));
      setRemaining(left);
      if (left <= 0 && !done.current) {
        done.current = true;
        completeOutage();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [completeOutage]);

  useEffect(() => {
    if (cleared >= TARGET_CLEARS && !done.current) {
      done.current = true;
      completeOutage();
    }
  }, [cleared, completeOutage]);

  const clearTicket = (match: Falling) => {
    playKeyClack();
    setBursts((b) => [
      ...b,
      { id: match.id, x: match.x, y: match.y, born: performance.now() },
    ]);
    setFalling((list) => list.filter((t) => t.id !== match.id));
    setCleared((c) => c + 1);
    setTyped("");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done.current) return;
      if (e.key === "Backspace") {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      if (e.key === "Enter") {
        const match = fallingRef.current.find(
          (t) => t.word.toLowerCase() === typed.trim().toLowerCase()
        );
        if (match) clearTicket(match);
        return;
      }
      if (e.key.length === 1) {
        playKeyClack();
        setTyped((t) => t + e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typed]);

  useEffect(() => {
    const match = falling.find(
      (t) => t.word.toLowerCase() === typed.trim().toLowerCase()
    );
    if (match && typed.trim().length > 0) clearTicket(match);
  }, [typed, falling]);

  const shakeX = inboxShake > 0 ? (inboxShake % 2 === 0 ? 4 : -4) : 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
      <div className="flex w-full max-w-[720px] justify-between font-pixel text-[10px] text-rose-300">
        <span className="anim-title-glitch">OUTAGE DEFENSE</span>
        <span>
          Cleared {cleared}/{TARGET_CLEARS} · {Math.ceil(remaining / 1000)}s
        </span>
      </div>
      <Stage width={width} height={height}>
        <Layer>
          <Rect width={width} height={height} fill="#140c12" />
          {/* danger gradient near inbox */}
          <Rect
            y={height - 80}
            width={width}
            height={52}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: 52 }}
            fillLinearGradientColorStops={[0, "#140c1200", 1, "#5c152244"]}
          />
          <Group x={shakeX}>
            <Rect y={height - 28} width={width} height={28} fill="#3a1520" />
            <Text
              text="INBOX — do not let tickets land"
              x={12}
              y={height - 20}
              fontSize={12}
              fill="#f8b4b4"
              fontFamily="monospace"
            />
          </Group>
          {falling.map((t) => {
            const w = Math.max(96, t.word.length * 11);
            const ox = Math.sin(t.wobble) * 6;
            return (
              <Group key={t.id} x={t.x + ox} y={t.y}>
                <Rect
                  y={4}
                  width={w}
                  height={28}
                  fill="#7f1d1d88"
                  opacity={0.5}
                />
                <Rect
                  width={w}
                  height={28}
                  fill="#e85d4c"
                  stroke="#0b1220"
                  strokeWidth={2}
                />
                <Rect x={4} y={4} width={6} height={6} fill="#f5d76e" />
                <Text
                  text={t.word}
                  x={14}
                  y={7}
                  fontSize={12}
                  fill="#fff"
                  fontFamily="monospace"
                />
              </Group>
            );
          })}
          {bursts.map((b) => {
            const age = (performance.now() - b.born) / 320;
            const s = 1 + age * 1.4;
            return (
              <Group key={`burst-${b.id}`} x={b.x} y={b.y} opacity={1 - age}>
                <Rect
                  width={80 * s}
                  height={28 * s}
                  fill="#f5d76e"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <Text
                  text="CLEARED"
                  x={8}
                  y={8}
                  fontSize={10}
                  fill="#0b1220"
                  fontFamily="monospace"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
      <div className="pixel-frame w-full max-w-[720px] border-2 border-rose-700 bg-[#1a1014] px-3 py-2 font-mono text-sm text-amber-100">
        Type: <span className="text-amber-300">{typed || "…"}</span>
        <span className="animate-pulse">▌</span>
      </div>
    </div>
  );
}
