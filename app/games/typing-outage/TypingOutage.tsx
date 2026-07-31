"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { useGameStore } from "@/store";
import { playKeyClack } from "@/components/ui/sfx";

const WORDS = [
  "JITTER",
  "PACKET LOSS",
  "SIP",
  "LATENCY",
  "CODEC",
  "RTP",
  "QoS",
  "MOS",
  "SBC",
  "REGISTER",
  "BYE",
  "INVITE",
  "NAT",
  "DTMF",
  "ECHO",
];

type Falling = {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
};

const DURATION_MS = 45000;
const TARGET_CLEARS = 12;

export function TypingOutage() {
  const applyEffect = useGameStore((s) => s.applyEffect);
  const completeOutage = useGameStore((s) => s.completeOutage);

  const [width, setWidth] = useState(640);
  const height = 380;
  const [falling, setFalling] = useState<Falling[]>([]);
  const [typed, setTyped] = useState("");
  const [cleared, setCleared] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
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
          speed: 0.9 + Math.random() * 0.8,
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
          } else {
            next.push({ ...t, y });
          }
        }
        return next;
      });
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
        if (match) {
          playKeyClack();
          setFalling((list) => list.filter((t) => t.id !== match.id));
          setCleared((c) => c + 1);
          setTyped("");
        }
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

  // Auto-match while typing (no enter required for better feel)
  useEffect(() => {
    const match = falling.find(
      (t) => t.word.toLowerCase() === typed.trim().toLowerCase()
    );
    if (match && typed.trim().length > 0) {
      playKeyClack();
      setFalling((list) => list.filter((t) => t.id !== match.id));
      setCleared((c) => c + 1);
      setTyped("");
    }
  }, [typed, falling]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
      <div className="flex w-full max-w-[720px] justify-between font-pixel text-[10px] text-rose-300">
        <span>OUTAGE DEFENSE</span>
        <span>
          Cleared {cleared}/{TARGET_CLEARS} · {Math.ceil(remaining / 1000)}s
        </span>
      </div>
      <Stage width={width} height={height}>
        <Layer>
          <Rect width={width} height={height} fill="#140c12" />
          <Rect
            y={height - 28}
            width={width}
            height={28}
            fill="#3a1520"
          />
          <Text
            text="INBOX — do not let tickets land"
            x={12}
            y={height - 20}
            fontSize={12}
            fill="#f8b4b4"
            fontFamily="monospace"
          />
          {falling.map((t) => (
            <Rect
              key={t.id}
              x={t.x}
              y={t.y}
              width={Math.max(90, t.word.length * 11)}
              height={28}
              fill="#e85d4c"
              stroke="#0b1220"
              strokeWidth={2}
            />
          ))}
          {falling.map((t) => (
            <Text
              key={`txt-${t.id}`}
              text={t.word}
              x={t.x + 8}
              y={t.y + 7}
              fontSize={12}
              fill="#fff"
              fontFamily="monospace"
            />
          ))}
        </Layer>
      </Stage>
      <div className="pixel-frame w-full max-w-[720px] border-2 border-rose-700 bg-[#1a1014] px-3 py-2 font-mono text-sm text-amber-100">
        Type: <span className="text-amber-300">{typed || "…"}</span>
        <span className="animate-pulse">▌</span>
      </div>
    </div>
  );
}
