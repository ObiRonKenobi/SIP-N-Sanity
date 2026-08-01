"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Line, Group } from "react-konva";
import layout from "@/data/office-layout.json";
import { useGameStore } from "@/store";

type Pos = { x: number; y: number };

type Enemy = {
  id: string;
  pos: Pos;
  path: Pos[];
  pathIndex: number;
  dir: number; // radians facing
  visionLen: number;
  visionAngle: number;
};

const CELL = 40;

function inCone(
  enemy: Enemy,
  target: Pos,
  wider: boolean
): boolean {
  const len = wider ? enemy.visionLen * 1.35 : enemy.visionLen;
  const ang = wider ? enemy.visionAngle * 1.2 : enemy.visionAngle;
  const dx = target.x - enemy.pos.x;
  const dy = target.y - enemy.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > len || dist < 0.2) return false;
  const bearing = Math.atan2(dy, dx);
  let diff = bearing - enemy.dir;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= ang / 2;
}

export function LunchStealth() {
  const completeLunch = useGameStore((s) => s.completeLunch);
  const gameTime = useGameStore((s) => s.gameTime);
  const wider = gameTime >= 360;

  const gridW = layout.grid.width;
  const gridH = layout.grid.height;
  const breakroom = layout.breakroom;

  const [player, setPlayer] = useState<Pos>({ x: 4, y: 6 });
  const [status, setStatus] = useState("Reach the breakroom. WASD / arrows.");
  const done = useRef(false);

  const [enemies, setEnemies] = useState<Enemy[]>(() => [
    {
      id: "qa",
      pos: { x: 2, y: 2 },
      path: [
        { x: 2, y: 2 },
        { x: 5, y: 2 },
        { x: 5, y: 4 },
        { x: 2, y: 4 },
      ],
      pathIndex: 0,
      dir: 0,
      visionLen: 3.2,
      visionAngle: Math.PI / 2.4,
    },
    {
      id: "sales",
      pos: { x: 9, y: 5 },
      path: [
        { x: 9, y: 5 },
        { x: 9, y: 2 },
        { x: 7, y: 2 },
        { x: 7, y: 5 },
      ],
      pathIndex: 0,
      dir: Math.PI,
      visionLen: 3,
      visionAngle: Math.PI / 2.6,
    },
    {
      id: "hw",
      pos: { x: 5, y: 1 },
      path: [
        { x: 5, y: 1 },
        { x: 8, y: 1 },
        { x: 8, y: 3 },
        { x: 5, y: 3 },
      ],
      pathIndex: 0,
      dir: 0,
      visionLen: 2.8,
      visionAngle: Math.PI / 2.5,
    },
  ]);

  const stageW = gridW * CELL;
  const stageH = gridH * CELL;

  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (done.current) return;
      setPlayer((p) => {
        const nx = Math.max(0, Math.min(gridW - 1, p.x + dx));
        const ny = Math.max(0, Math.min(gridH - 1, p.y + dy));
        return { x: nx, y: ny };
      });
    },
    [gridW, gridH]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") movePlayer(0, -1);
      if (k === "s" || k === "arrowdown") movePlayer(0, 1);
      if (k === "a" || k === "arrowleft") movePlayer(-1, 0);
      if (k === "d" || k === "arrowright") movePlayer(1, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [movePlayer]);

  // Enemy patrol
  useEffect(() => {
    const id = window.setInterval(() => {
      setEnemies((list) =>
        list.map((en) => {
          const nextIndex = (en.pathIndex + 1) % en.path.length;
          const target = en.path[nextIndex];
          const dx = target.x - en.pos.x;
          const dy = target.y - en.pos.y;
          let pos = { ...en.pos };
          let pathIndex = en.pathIndex;
          let dir = en.dir;
          if (dx !== 0 || dy !== 0) {
            pos = {
              x: en.pos.x + Math.sign(dx),
              y: en.pos.y + Math.sign(dy),
            };
            dir = Math.atan2(Math.sign(dy), Math.sign(dx));
            if (pos.x === target.x && pos.y === target.y) pathIndex = nextIndex;
          } else {
            pathIndex = nextIndex;
          }
          return { ...en, pos, pathIndex, dir };
        })
      );
    }, 550);
    return () => window.clearInterval(id);
  }, []);

  // Win / catch checks
  useEffect(() => {
    if (done.current) return;
    if (player.x === breakroom.x && player.y === breakroom.y) {
      done.current = true;
      setStatus("Breakroom secured.");
      window.setTimeout(() => completeLunch(true), 600);
      return;
    }
    for (const en of enemies) {
      if (inCone(en, player, wider)) {
        done.current = true;
        setStatus("Spotted!");
        window.setTimeout(() => completeLunch(false), 600);
        return;
      }
    }
  }, [player, enemies, breakroom, completeLunch, wider]);

  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  const cones = useMemo(() => {
    return enemies.map((en) => {
      const len = (wider ? en.visionLen * 1.35 : en.visionLen) * CELL;
      const ang = wider ? en.visionAngle * 1.2 : en.visionAngle;
      const cx = en.pos.x * CELL + CELL / 2;
      const cy = en.pos.y * CELL + CELL / 2;
      const a0 = en.dir - ang / 2;
      const a1 = en.dir + ang / 2;
      const points = [
        cx,
        cy,
        cx + Math.cos(a0) * len,
        cy + Math.sin(a0) * len,
        cx + Math.cos(a1) * len,
        cy + Math.sin(a1) * len,
      ];
      const alpha = pulse % 2 === 0 ? 0.32 : 0.22;
      return { id: en.id, points, alpha, cx, cy, dir: en.dir };
    });
  }, [enemies, wider, pulse]);

  const enemyColors: Record<string, string> = {
    qa: "#c45c26",
    sales: "#d4a017",
    hw: "#e85d4c",
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
      <p className="font-pixel text-[10px] text-sky-200">{status}</p>
      <Stage width={stageW} height={stageH}>
        <Layer>
          <Rect width={stageW} height={stageH} fill="#152033" />
          {Array.from({ length: gridH }).map((_, y) =>
            Array.from({ length: gridW }).map((_, x) => (
              <Rect
                key={`${x}-${y}`}
                x={x * CELL}
                y={y * CELL}
                width={CELL}
                height={CELL}
                fill={(x + y) % 2 === 0 ? "#1a2740" : "#182438"}
                stroke="#243652"
                strokeWidth={1}
              />
            ))
          )}
          {/* breakroom glow */}
          <Rect
            x={breakroom.x * CELL}
            y={breakroom.y * CELL}
            width={CELL}
            height={CELL}
            fill={pulse % 2 === 0 ? "#3ecf8ecc" : "#3ecf8e99"}
          />
          <Rect
            x={breakroom.x * CELL + 8}
            y={breakroom.y * CELL + 10}
            width={24}
            height={6}
            fill="#f5d76e"
          />
          <Rect
            x={breakroom.x * CELL + 8}
            y={breakroom.y * CELL + 16}
            width={24}
            height={6}
            fill="#3ecf8e"
          />
          <Rect
            x={breakroom.x * CELL + 8}
            y={breakroom.y * CELL + 22}
            width={24}
            height={6}
            fill="#f5d76e"
          />
          <Text
            text="BR"
            x={breakroom.x * CELL}
            y={breakroom.y * CELL + 2}
            width={CELL}
            align="center"
            fontSize={9}
            fill="#dfffea"
            fontFamily="monospace"
          />
          {cones.map((c) => (
            <Line
              key={c.id}
              points={c.points}
              closed
              fill={`rgba(232,93,76,${c.alpha})`}
              stroke="rgba(255,160,120,0.65)"
              strokeWidth={1}
            />
          ))}
          {/* Santa desk */}
          <Group x={7 * CELL} y={3 * CELL}>
            <Rect width={CELL} height={CELL} fill="#7f1d1d" />
            <Rect x={8} y={6} width={24} height={20} fill="#b91c1c" />
            <Rect x={10} y={18} width={20} height={10} fill="#f5f5f4" />
          </Group>
          {enemies.map((en) => {
            const cx = en.pos.x * CELL + CELL / 2;
            const cy = en.pos.y * CELL + CELL / 2;
            const color = enemyColors[en.id] ?? "#e85d4c";
            const fx = Math.cos(en.dir) * 10;
            const fy = Math.sin(en.dir) * 10;
            return (
              <Group key={en.id}>
                {/* body */}
                <Rect
                  x={cx - 10}
                  y={cy - 10}
                  width={20}
                  height={20}
                  fill={color}
                  stroke="#0b1220"
                  strokeWidth={2}
                />
                {/* head */}
                <Rect
                  x={cx - 6}
                  y={cy - 14}
                  width={12}
                  height={8}
                  fill="#e8c4a0"
                  stroke="#0b1220"
                  strokeWidth={1}
                />
                {/* facing tick */}
                <Line
                  points={[cx, cy, cx + fx, cy + fy]}
                  stroke="#0b1220"
                  strokeWidth={3}
                />
                <Text
                  text={en.id === "qa" ? "QA" : en.id === "sales" ? "SL" : "HW"}
                  x={cx - 10}
                  y={cy + 12}
                  width={20}
                  align="center"
                  fontSize={8}
                  fill="#e2e8f0"
                  fontFamily="monospace"
                />
              </Group>
            );
          })}
          {/* player */}
          <Group>
            <Rect
              x={player.x * CELL + 8}
              y={player.y * CELL + 8}
              width={24}
              height={24}
              fill="#5eb1ff"
              stroke="#0b1220"
              strokeWidth={2}
            />
            <Rect
              x={player.x * CELL + 12}
              y={player.y * CELL + 4}
              width={16}
              height={10}
              fill="#e8c4a0"
            />
            <Rect
              x={player.x * CELL + 6}
              y={player.y * CELL + 14}
              width={4}
              height={8}
              fill="#1e293b"
            />
            <Text
              text="YOU"
              x={player.x * CELL}
              y={player.y * CELL + 30}
              width={CELL}
              align="center"
              fontSize={8}
              fill="#93c5fd"
              fontFamily="monospace"
            />
          </Group>
        </Layer>
      </Stage>
      <p className="font-mono text-[10px] text-slate-400">
        Blue = you · Warm colors = coworkers · Green = breakroom · Cones = vision
      </p>
    </div>
  );
}
