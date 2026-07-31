"use client";

import { useMemo, useState } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { useGameStore, type DoorKey } from "@/store";
import { playDoorSqueak, playOgreSlam } from "@/components/ui/sfx";

const DOOR_COLORS = ["#5b7c99", "#6a8a6e", "#8a6a5b"];

function doorLabel(key: DoorKey, revealed: boolean): string {
  if (!revealed) return "???";
  if (key === "clean") return "THRONE";
  if (key === "ogre") return "OGRE!";
  return "EMPTY";
}

export function BathroomGamble() {
  const bathroomDoors = useGameStore((s) => s.bathroomDoors);
  const completeBathroom = useGameStore((s) => s.completeBathroom);
  const finishBathroom = useGameStore((s) => s.finishBathroom);
  const clearDialog = useGameStore((s) => s.clearDialog);

  const [picked, setPicked] = useState<number | null>(null);
  const [showExit, setShowExit] = useState(false);

  const size = useMemo(() => {
    if (typeof window === "undefined") return { w: 640, h: 360 };
    return {
      w: Math.min(720, window.innerWidth - 48),
      h: 360,
    };
  }, []);

  const onPick = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    playDoorSqueak();
    const key = bathroomDoors[index];
    if (key === "ogre") playOgreSlam();
    completeBathroom(index);
    window.setTimeout(() => {
      clearDialog();
      setShowExit(true);
    }, 2200);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#121820]/95 p-2">
      <p className="font-pixel text-xs text-amber-200">
        10:30 — Pick a stall. Destiny awaits.
      </p>
      <Stage width={size.w} height={size.h}>
        <Layer>
          <Rect width={size.w} height={size.h} fill="#1a222c" />
          <Text
            text="RESTROOM"
            x={size.w / 2 - 60}
            y={16}
            fontSize={14}
            fontFamily="monospace"
            fill="#c4a35a"
          />
          {bathroomDoors.map((key, i) => {
            const doorW = 120;
            const gap = 36;
            const total = 3 * doorW + 2 * gap;
            const startX = (size.w - total) / 2;
            const x = startX + i * (doorW + gap);
            const y = 70;
            const open = picked === i;
            return (
              <Group
                key={i}
                x={x}
                y={y}
                onClick={() => onPick(i)}
                onTap={() => onPick(i)}
              >
                <Rect
                  width={doorW}
                  height={220}
                  fill={open ? "#0d1520" : DOOR_COLORS[i]}
                  stroke="#0b1220"
                  strokeWidth={4}
                />
                {!open && (
                  <Rect
                    x={doorW - 28}
                    y={110}
                    width={14}
                    height={10}
                    fill="#d4af37"
                  />
                )}
                {open && (
                  <>
                    <Rect
                      x={20}
                      y={40}
                      width={80}
                      height={140}
                      fill={
                        key === "clean"
                          ? "#dfe8ef"
                          : key === "ogre"
                            ? "#3d5a2e"
                            : "#2a3340"
                      }
                    />
                    {key === "ogre" && (
                      <Text
                        text="👁️👁️"
                        x={30}
                        y={80}
                        fontSize={24}
                        fill="#fff"
                      />
                    )}
                    {key === "clean" && (
                      <Rect
                        x={35}
                        y={100}
                        width={50}
                        height={40}
                        fill="#9ec9e0"
                        cornerRadius={4}
                      />
                    )}
                  </>
                )}
                <Text
                  text={doorLabel(key, open)}
                  x={0}
                  y={230}
                  width={doorW}
                  align="center"
                  fontSize={12}
                  fontFamily="monospace"
                  fill="#e2e8f0"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
      {showExit && (
        <button
          type="button"
          className="pixel-btn bg-amber-400 px-6 py-2 font-pixel text-xs text-[#1a2332]"
          onClick={() => finishBathroom()}
        >
          Back to Work
        </button>
      )}
    </div>
  );
}
