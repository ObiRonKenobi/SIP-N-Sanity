"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Line, Circle } from "react-konva";
import { motion } from "framer-motion";
import { useGameStore, type DoorKey } from "@/store";
import { playDoorSqueak, playOgreSlam } from "@/components/ui/sfx";

const DOOR_COLORS = ["#5b7c99", "#6a8a6e", "#8a6a5b"];
const DOOR_W = 100;
const DOOR_H = 180;

function doorLabel(key: DoorKey, revealed: boolean): string {
  if (!revealed) return "STALL";
  if (key === "clean") return "THRONE";
  if (key === "ogre") return "OGRE!";
  return "EMPTY";
}

function RevealArt({ keyType }: { keyType: DoorKey }) {
  if (keyType === "clean") {
    return (
      <Group>
        <Rect x={22} y={40} width={56} height={80} fill="#cfdce8" />
        <Rect x={30} y={95} width={40} height={30} fill="#9ec9e0" cornerRadius={4} />
        <Circle x={50} y={60} radius={3} fill="#fff8" />
        <Text
          x={10}
          y={140}
          width={80}
          align="center"
          text="ahh…"
          fontSize={11}
          fill="#1a2740"
          fontFamily="monospace"
        />
      </Group>
    );
  }
  if (keyType === "ogre") {
    return (
      <Group>
        <Rect x={20} y={32} width={60} height={90} fill="#3d5a2e" />
        <Circle x={40} y={60} radius={7} fill="#1a2a10" />
        <Circle x={60} y={60} radius={7} fill="#1a2a10" />
        <Circle x={40} y={60} radius={3} fill="#e85d4c" />
        <Circle x={60} y={60} radius={3} fill="#e85d4c" />
        <Rect x={32} y={82} width={36} height={16} fill="#1a2a10" />
        <Line
          points={[36, 86, 44, 94, 50, 86, 56, 94, 64, 86]}
          stroke="#8fbf6a"
          strokeWidth={2}
        />
        <Text
          x={8}
          y={135}
          width={84}
          align="center"
          text="TP!!!"
          fontSize={14}
          fill="#f5d76e"
          fontFamily="monospace"
        />
      </Group>
    );
  }
  return (
    <Group>
      <Rect x={16} y={32} width={68} height={120} fill="#2a3340" />
      <Text
        x={16}
        y={85}
        width={68}
        align="center"
        text="…"
        fontSize={28}
        fill="#64748b"
        fontFamily="monospace"
      />
    </Group>
  );
}

export function BathroomGamble() {
  const bathroomDoors = useGameStore((s) => s.bathroomDoors);
  const completeBathroom = useGameStore((s) => s.completeBathroom);
  const finishBathroom = useGameStore((s) => s.finishBathroom);
  const clearDialog = useGameStore((s) => s.clearDialog);

  const [picked, setPicked] = useState<number | null>(null);
  const [doorAngle, setDoorAngle] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [size, setSize] = useState({ w: 480, h: 260 });
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({
        w: Math.max(280, Math.floor(r.width)),
        h: Math.max(180, Math.floor(r.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const goBackToWork = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    clearDialog();
    finishBathroom();
  };

  const swingOpen = (onDone: () => void) => {
    const start = performance.now();
    const duration = 480;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDoorAngle(-78 * eased);
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else onDone();
    };
    animRef.current = requestAnimationFrame(step);
  };

  const onPick = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    playDoorSqueak();
    const key = bathroomDoors[index];
    swingOpen(() => {
      if (key === "ogre") playOgreSlam();
      completeBathroom(index);
      setShowExit(true);
      // Auto-return so a clipped button can't soft-lock the shift
      exitTimerRef.current = window.setTimeout(() => {
        goBackToWork();
      }, 2800);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121820]/95 p-2">
      <motion.p
        className="shrink-0 pb-1 text-center font-pixel text-[10px] text-amber-200 sm:text-xs"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        10:30 — Pick a stall. Destiny awaits.
      </motion.p>

      <div ref={stageWrapRef} className="min-h-0 flex-1 overflow-hidden">
        <Stage width={size.w} height={size.h}>
          <Layer>
            <Rect width={size.w} height={size.h} fill="#1a222c" />
            <Text
              text="RESTROOM"
              x={size.w / 2 - 48}
              y={8}
              fontSize={12}
              fontFamily="monospace"
              fill="#c4a35a"
            />
            {bathroomDoors.map((key, i) => {
              const gap = 20;
              const total = 3 * DOOR_W + 2 * gap;
              const startX = (size.w - total) / 2;
              const x = startX + i * (DOOR_W + gap);
              const y = Math.max(28, (size.h - DOOR_H - 28) / 2);
              const isPicked = picked === i;
              const angle = isPicked ? doorAngle : 0;

              return (
                <Group key={i} x={x} y={y}>
                  <Rect
                    width={DOOR_W}
                    height={DOOR_H}
                    fill="#0d1520"
                    stroke="#3d4a5c"
                    strokeWidth={5}
                  />
                  {(isPicked || picked === i) && doorAngle < -10 && (
                    <RevealArt keyType={key} />
                  )}
                  <Group
                    rotation={angle}
                    onClick={() => onPick(i)}
                    onTap={() => onPick(i)}
                  >
                    <Rect
                      width={DOOR_W - 4}
                      height={DOOR_H - 4}
                      x={2}
                      y={2}
                      fill={DOOR_COLORS[i]}
                      stroke="#0b1220"
                      strokeWidth={3}
                    />
                    <Rect
                      x={12}
                      y={20}
                      width={DOOR_W - 28}
                      height={55}
                      stroke="#0b1220"
                      strokeWidth={2}
                      fill="transparent"
                    />
                    <Rect
                      x={12}
                      y={90}
                      width={DOOR_W - 28}
                      height={55}
                      stroke="#0b1220"
                      strokeWidth={2}
                      fill="transparent"
                    />
                    <Circle
                      x={DOOR_W - 20}
                      y={DOOR_H / 2}
                      radius={5}
                      fill="#d4af37"
                      stroke="#0b1220"
                      strokeWidth={2}
                    />
                  </Group>
                  <Text
                    text={doorLabel(key, isPicked && doorAngle < -60)}
                    x={0}
                    y={DOOR_H + 6}
                    width={DOOR_W}
                    align="center"
                    fontSize={11}
                    fontFamily="monospace"
                    fill="#e2e8f0"
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 pt-2">
        {showExit ? (
          <button
            type="button"
            className="pixel-btn bg-amber-400 px-6 py-2 font-pixel text-xs text-[#1a2332]"
            onClick={goBackToWork}
          >
            Back to Work
          </button>
        ) : (
          <p className="font-mono text-[10px] text-slate-500">
            Click a door to open it
          </p>
        )}
      </div>
    </div>
  );
}
