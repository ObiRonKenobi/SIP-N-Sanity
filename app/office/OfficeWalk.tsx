"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { AudioSettings } from "@/components/ui/AudioSettings";
import { startDemoMusic } from "@/components/ui/demoMusic";
import { SPRITES } from "@/lib/sprites";
import { LAYOUT_DEBUG } from "@/lib/layoutDebug";
import officeLayout from "@/data/office-walk-layout.json";
import deskArchetypes from "@/data/desk-archetypes.json";
import {
  type Pos,
  absoluteToRelativeFootprint,
  clamp,
  deskFootRadius,
  edgesAtVertex,
  extremeVertex,
  frontContourY,
  hitsAnyDeskFloor,
  inflatePoly,
  insertFootprintVertex,
  isBehindDesk,
  pointInPoly,
  relativeToAbsoluteFootprint,
  scalePoly,
} from "@/lib/deskCollision";

type Facing = "front" | "back" | "left" | "right";
type WalkFrame = "idle" | "walk1" | "walk2";
type DebugTarget = "player" | "desk" | "footprint" | "floor" | "feet";
type ArchetypeId = keyof typeof deskArchetypes;

type PlacedDesk = {
  id: string;
  sprite: string;
  archetype: ArchetypeId;
  x: number;
  y: number;
  w: number;
  h: number;
  relativeFootprintPoly: Pos[];
};

type DragState =
  | {
      kind: "player" | "desk" | "floor-move" | "footprint-move" | "feet-line";
      startX: number;
      startY: number;
      orig: Record<string, number>;
      origPoly?: Pos[];
    }
  | {
      kind: "floor-vertex" | "footprint-vertex";
      startX: number;
      startY: number;
      index: number;
      orig: Pos;
    };

const OFFICE_MAP = { w: 682, h: 366 };

const DESK_SRC: Record<string, string> = {
  deskRegular: SPRITES.deskRegular,
  deskHero: SPRITES.deskHero,
  deskSanta: SPRITES.deskSanta,
  deskManager: SPRITES.deskManager,
};

const MOVE_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

function fitAspect(parentW: number, parentH: number, aspect: number) {
  if (parentW <= 0 || parentH <= 0) return { w: 0, h: 0 };
  if (parentW / parentH > aspect) {
    const h = parentH;
    return { w: h * aspect, h };
  }
  const w = parentW;
  return { w, h: w / aspect };
}

function unit(dx: number, dy: number): Pos {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Two dominant edge directions from the walk floor (iso axes). */
function floorIsoAxes(poly: Pos[]): { a: Pos; b: Pos } {
  const edges: { ang: number; ux: number; uy: number; len: number }[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 3) continue;
    let ang = Math.atan2(dy, dx);
    if (ang < 0) ang += Math.PI;
    if (ang >= Math.PI) ang -= Math.PI;
    edges.push({ ang, ux: dx / len, uy: dy / len, len });
  }
  if (edges.length < 2) {
    const s = OFFICE_MAP.w / (2 * OFFICE_MAP.h);
    return { a: unit(1, -s), b: unit(1, s) };
  }
  edges.sort((e0, e1) => e1.len - e0.len);
  const seed = edges[0];
  let aLen = 0;
  let bLen = 0;
  let aSum = { x: 0, y: 0 };
  let bSum = { x: 0, y: 0 };
  for (const e of edges) {
    let d = Math.abs(e.ang - seed.ang);
    if (d > Math.PI / 2) d = Math.PI - d;
    const flip =
      e.ux * seed.ux + e.uy * seed.uy < 0
        ? { x: -e.ux, y: -e.uy }
        : { x: e.ux, y: e.uy };
    if (d < Math.PI / 5) {
      aSum.x += flip.x * e.len;
      aSum.y += flip.y * e.len;
      aLen += e.len;
    } else {
      bSum.x += flip.x * e.len;
      bSum.y += flip.y * e.len;
      bLen += e.len;
    }
  }
  const a = aLen > 0 ? unit(aSum.x, aSum.y) : unit(seed.ux, seed.uy);
  const b =
    bLen > 0
      ? unit(bSum.x, bSum.y)
      : unit(a.y, -a.x);
  return { a, b };
}

/** Iso grid segments clipped loosely to the floor AABB, meant for SVG clipPath. */
function buildIsoGridLines(
  poly: Pos[],
  spacing: number,
): { x1: number; y1: number; x2: number; y2: number; major: boolean }[] {
  if (poly.length < 3) return [];
  const { a, b } = floorIsoAxes(poly);
  const c = poly.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  const origin = { x: c.x / poly.length, y: c.y / poly.length };
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const pad = spacing * 2;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const reach = Math.hypot(maxX - minX, maxY - minY) + spacing * 4;

  const projA = poly.map((p) => (p.x - origin.x) * a.x + (p.y - origin.y) * a.y);
  const projB = poly.map((p) => (p.x - origin.x) * b.x + (p.y - origin.y) * b.y);
  const a0 = Math.floor(Math.min(...projA) / spacing) * spacing;
  const a1 = Math.ceil(Math.max(...projA) / spacing) * spacing;
  const b0 = Math.floor(Math.min(...projB) / spacing) * spacing;
  const b1 = Math.ceil(Math.max(...projB) / spacing) * spacing;

  const lines: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }[] = [];

  // Lines parallel to A (constant proj onto B)
  for (let t = b0, i = 0; t <= b1 + 1e-6; t += spacing, i++) {
    const ox = origin.x + b.x * t;
    const oy = origin.y + b.y * t;
    lines.push({
      x1: ox - a.x * reach,
      y1: oy - a.y * reach,
      x2: ox + a.x * reach,
      y2: oy + a.y * reach,
      major: i % 4 === 0,
    });
  }
  // Lines parallel to B (constant proj onto A)
  for (let t = a0, i = 0; t <= a1 + 1e-6; t += spacing, i++) {
    const ox = origin.x + a.x * t;
    const oy = origin.y + a.y * t;
    lines.push({
      x1: ox - b.x * reach,
      y1: oy - b.y * reach,
      x2: ox + b.x * reach,
      y2: oy + b.y * reach,
      major: i % 4 === 0,
    });
  }
  return lines;
}

function relFromArchetype(archetype: ArchetypeId): Pos[] {
  return (deskArchetypes[archetype]?.relativeFootprintPoly ?? []).map((p) => ({
    ...p,
  }));
}

function cloneDesks(src: typeof officeLayout.desks): PlacedDesk[] {
  return src.map((d) => {
    const archetype = d.archetype as ArchetypeId;
    const override = (
      d as { relativeFootprintPoly?: Pos[] }
    ).relativeFootprintPoly;
    return {
      id: d.id,
      sprite: d.sprite,
      archetype,
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
      relativeFootprintPoly:
        override?.length ? override.map((p) => ({ ...p })) : relFromArchetype(archetype),
    };
  });
}

/**
 * Main-game office walk shell: multi-desk collision from shared archetypes.
 * Demo (/demo) is untouched. Dev F2 tunes relative footprints + layout.
 */
export function OfficeWalk() {
  const [player, setPlayer] = useState<Pos>({ ...officeLayout.playerStart });
  const [facing, setFacing] = useState<Facing>("back");
  const [walkFrame, setWalkFrame] = useState<WalkFrame>("idle");

  const [debug, setDebug] = useState(false);
  const [debugTarget, setDebugTarget] = useState<DebugTarget>("desk");
  const [floorLocked, setFloorLocked] = useState(true);
  const [showIsoGrid, setShowIsoGrid] = useState(true);
  const [gridSpacing, setGridSpacing] = useState(3);
  const [probeWalk, setProbeWalk] = useState(false);
  const [footTrail, setFootTrail] = useState<
    { x: number; y: number; blocked: boolean }[]
  >([]);
  const [playerHeightPct, setPlayerHeightPct] = useState(
    officeLayout.playerHeightPct,
  );
  const [footAnchorPct, setFootAnchorPct] = useState(
    officeLayout.footAnchorPct ?? 100,
  );
  const [deskSortBias] = useState(officeLayout.deskSortBias ?? 0);
  const [desks, setDesks] = useState<PlacedDesk[]>(() =>
    cloneDesks(officeLayout.desks),
  );
  const [selectedDeskId, setSelectedDeskId] = useState(
    () => officeLayout.desks[0]?.id ?? "",
  );
  const [floorPoly, setFloorPoly] = useState<Pos[]>(() =>
    officeLayout.floorPoly.map((p) => ({ ...p })),
  );
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const debugRef = useRef(false);
  const probeWalkRef = useRef(false);
  const trailAccRef = useRef(0);
  const desksRef = useRef(desks);
  const floorRef = useRef(floorPoly);
  const boundsRef = useRef(officeLayout.bounds);
  const keysRef = useRef<Record<string, boolean>>({});
  const posRef = useRef<Pos>({ ...officeLayout.playerStart });
  const facingRef = useRef<Facing>("back");
  const walkPhase = useRef(0);
  const animAccum = useRef(0);
  const wasMoving = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [stagePx, setStagePx] = useState({ w: 0, h: 0 });

  const selectedDesk =
    desks.find((d) => d.id === selectedDeskId) ?? desks[0] ?? null;

  const absoluteFootprints = useMemo(() => {
    return desks.map((d) => ({
      desk: d,
      poly: relativeToAbsoluteFootprint(d, d.relativeFootprintPoly),
    }));
  }, [desks]);

  const selectedAbsPoly = useMemo(() => {
    if (!selectedDesk) return [] as Pos[];
    const hit = absoluteFootprints.find((a) => a.desk.id === selectedDesk.id);
    return hit?.poly ?? [];
  }, [absoluteFootprints, selectedDesk]);

  useEffect(() => {
    setDesks(cloneDesks(officeLayout.desks));
  }, [officeLayout]);

  useEffect(() => {
    desksRef.current = desks;
  }, [desks]);
  useEffect(() => {
    floorRef.current = floorPoly;
  }, [floorPoly]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const aspect = OFFICE_MAP.w / OFFICE_MAP.h;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStagePx(fitAspect(r.width, r.height, aspect));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [debug]);

  useEffect(() => {
    startDemoMusic();
  }, []);

  useEffect(() => {
    debugRef.current = debug;
    if (debug) {
      keysRef.current = {};
      setWalkFrame("idle");
    } else {
      setProbeWalk(false);
    }
  }, [debug]);

  useEffect(() => {
    probeWalkRef.current = probeWalk;
    if (probeWalk) keysRef.current = {};
  }, [probeWalk]);

  const toggleDebug = useCallback(() => {
    if (!LAYOUT_DEBUG) return;
    setDebug((d) => !d);
  }, []);

  useEffect(() => {
    const setKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (
        LAYOUT_DEBUG &&
        down &&
        (e.key === "F2" || (e.ctrlKey && k === "d"))
      ) {
        e.preventDefault();
        toggleDebug();
        return;
      }
      if (!MOVE_KEYS.has(k)) return;
      if (debugRef.current && !probeWalkRef.current) return;
      e.preventDefault();
      keysRef.current[k] = down;
    };
    const down = (e: KeyboardEvent) => setKey(e, true);
    const up = (e: KeyboardEvent) => setKey(e, false);
    const blur = () => {
      keysRef.current = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [toggleDebug]);

  // Debug nudge / scale
  useEffect(() => {
    if (!LAYOUT_DEBUG || !debug) return;

    const onKey = (e: KeyboardEvent) => {
      if (probeWalk) {
        if (e.key === "Tab") {
          e.preventDefault();
          cycleDesk(1);
        }
        return;
      }

      const step = e.shiftKey ? 0.25 : 1;
      const scaleStep = e.shiftKey ? 0.5 : 2;

      if (e.key === "Tab") {
        e.preventDefault();
        const order: DebugTarget[] = [
          "player",
          "desk",
          "footprint",
          "feet",
          "floor",
        ];
        setDebugTarget((t) => order[(order.indexOf(t) + 1) % order.length]);
        return;
      }
      if (e.key === "1") {
        setDebugTarget("player");
        return;
      }
      if (e.key === "2") {
        setDebugTarget("desk");
        return;
      }
      if (e.key === "3") {
        setDebugTarget("footprint");
        return;
      }
      if (e.key === "4") {
        setDebugTarget("feet");
        return;
      }
      if (e.key === "5") {
        setDebugTarget("floor");
        return;
      }
      if (e.key === "," || e.key === "<") {
        e.preventDefault();
        cycleDesk(-1);
        return;
      }
      if (e.key === "." || e.key === ">") {
        e.preventDefault();
        cycleDesk(1);
        return;
      }

      const applyMove = (dx: number, dy: number) => {
        if (debugTarget === "player") {
          setPlayer((p) => {
            const next = { x: p.x + dx, y: p.y + dy };
            posRef.current = next;
            return next;
          });
        } else if (debugTarget === "desk" && selectedDeskId) {
          setDesks((list) =>
            list.map((d) =>
              d.id === selectedDeskId
                ? { ...d, x: d.x + dx, y: d.y + dy }
                : d,
            ),
          );
        } else if (debugTarget === "footprint" && selectedDeskId) {
          nudgeDeskFootprint(selectedDeskId, dx, dy);
        } else if (debugTarget === "floor") {
          setFloorPoly((poly) =>
            poly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          );
        }
      };

      const applyScale = (delta: number) => {
        if (debugTarget === "player") {
          setPlayerHeightPct((h) =>
            clamp(+(h + delta).toFixed(2), 8, 70),
          );
        } else if (debugTarget === "desk" && selectedDeskId) {
          setDesks((list) =>
            list.map((d) =>
              d.id === selectedDeskId
                ? {
                    ...d,
                    w: clamp(+(d.w + delta).toFixed(2), 4, 50),
                    h: clamp(+(d.h + delta).toFixed(2), 4, 55),
                  }
                : d,
            ),
          );
        } else if (debugTarget === "footprint" && selectedDeskId) {
          scaleDeskFootprint(selectedDeskId, delta > 0 ? 1.05 : 0.95);
        } else if (debugTarget === "floor") {
          setFloorPoly((poly) => scalePoly(poly, delta > 0 ? 1.04 : 0.96));
        }
      };

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          applyMove(-step, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          applyMove(step, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          applyMove(0, -step);
          break;
        case "ArrowDown":
          e.preventDefault();
          applyMove(0, step);
          break;
        case "[":
        case "-":
        case "_":
          e.preventDefault();
          applyScale(-scaleStep);
          break;
        case "]":
        case "=":
        case "+":
          e.preventDefault();
          applyScale(scaleStep);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug, debugTarget, probeWalk, selectedDeskId, selectedDesk, desks]);

  function cycleDesk(dir: number) {
    if (!desks.length) return;
    const idx = Math.max(
      0,
      desks.findIndex((d) => d.id === selectedDeskId),
    );
    const next = desks[(idx + dir + desks.length) % desks.length];
    setSelectedDeskId(next.id);
  }

  /** Write an absolute footprint onto one desk only (relative to that sprite box). */
  function setDeskAbsPoly(deskId: string, abs: Pos[]) {
    setDesks((list) =>
      list.map((d) =>
        d.id === deskId
          ? {
              ...d,
              relativeFootprintPoly: absoluteToRelativeFootprint(d, abs),
            }
          : d,
      ),
    );
  }

  function nudgeDeskFootprint(deskId: string, dx: number, dy: number) {
    const desk = desksRef.current.find((d) => d.id === deskId);
    if (!desk) return;
    const abs = relativeToAbsoluteFootprint(desk, desk.relativeFootprintPoly).map(
      (p) => ({ x: p.x + dx, y: p.y + dy }),
    );
    setDeskAbsPoly(deskId, abs);
  }

  function scaleDeskFootprint(deskId: string, factor: number) {
    const desk = desksRef.current.find((d) => d.id === deskId);
    if (!desk) return;
    const abs = scalePoly(
      relativeToAbsoluteFootprint(desk, desk.relativeFootprintPoly),
      factor,
    );
    setDeskAbsPoly(deskId, abs);
  }

  // Movement
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = officeLayout.playerSpeed;
    const radius = deskFootRadius(officeLayout.playerRadius);

    const onFloor = (x: number, y: number) => {
      const floor = floorRef.current;
      const { minX, maxX, minY, maxY } = boundsRef.current;
      if (floor.length < 3) {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      }
      return pointInPoly(x, y, floor);
    };

    const deskPolysNow = () =>
      desksRef.current.map((d) =>
        relativeToAbsoluteFootprint(d, d.relativeFootprintPoly),
      );

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { minX, maxX, minY, maxY } = boundsRef.current;
      const allowWalk = !debugRef.current || probeWalkRef.current;

      if (allowWalk) {
        const k = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (k.w || k.arrowup) dy -= 1;
        if (k.s || k.arrowdown) dy += 1;
        if (k.a || k.arrowleft) dx -= 1;
        if (k.d || k.arrowright) dx += 1;

        const moving = dx !== 0 || dy !== 0;
        if (moving) {
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          if (Math.abs(dy) >= Math.abs(dx)) {
            facingRef.current = dy < 0 ? "back" : "front";
          } else {
            facingRef.current = dx < 0 ? "left" : "right";
          }

          const p = posRef.current;
          const polys = deskPolysNow();
          const stepX = dx * speed * dt;
          const stepY = dy * speed * dt;

          let blocked = false;
          let nx = clamp(p.x + stepX, minX, maxX);
          let ny = p.y;
          if (!onFloor(nx, ny) || hitsAnyDeskFloor(nx, ny, polys, radius)) {
            nx = p.x;
            blocked = true;
          }

          ny = clamp(p.y + stepY, minY, maxY);
          if (!onFloor(nx, ny) || hitsAnyDeskFloor(nx, ny, polys, radius)) {
            ny = p.y;
            blocked = true;
          }

          p.x = nx;
          p.y = ny;

          if (probeWalkRef.current) {
            trailAccRef.current += dt;
            if (trailAccRef.current >= 0.05) {
              trailAccRef.current = 0;
              setFootTrail((t) => {
                const next = [...t, { x: p.x, y: p.y, blocked }];
                return next.length > 180 ? next.slice(-180) : next;
              });
            }
          }

          animAccum.current += dt;
          let nextFrame: WalkFrame =
            walkPhase.current === 0 ? "walk1" : "walk2";
          if (animAccum.current >= 0.16) {
            animAccum.current = 0;
            walkPhase.current = (walkPhase.current + 1) % 2;
            nextFrame = walkPhase.current === 0 ? "walk1" : "walk2";
          }
          setFacing(facingRef.current);
          setWalkFrame(nextFrame);
          setPlayer({ x: p.x, y: p.y });
          wasMoving.current = true;
        } else if (wasMoving.current) {
          wasMoving.current = false;
          animAccum.current = 0;
          walkPhase.current = 0;
          setWalkFrame("idle");
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const solidRadius = deskFootRadius(officeLayout.playerRadius);
  const floorPoints = floorPoly.map((c) => `${c.x},${c.y}`).join(" ");
  const isoGridLines = useMemo(
    () => (showIsoGrid ? buildIsoGridLines(floorPoly, gridSpacing) : []),
    [floorPoly, showIsoGrid, gridSpacing],
  );
  const selectedPolyPoints = selectedAbsPoly
    .map((c) => `${c.x},${c.y}`)
    .join(" ");
  const selectedSolidPoints = inflatePoly(selectedAbsPoly, solidRadius)
    .map((c) => `${c.x},${c.y}`)
    .join(" ");

  const layoutObject = useMemo(
    () => ({
      playerStart: { x: +player.x.toFixed(2), y: +player.y.toFixed(2) },
      playerSpeed: officeLayout.playerSpeed,
      bounds: officeLayout.bounds,
      floorPoly: floorPoly.map((p) => ({
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
      })),
      playerHeightPct: +playerHeightPct.toFixed(2),
      footAnchorPct: +footAnchorPct.toFixed(2),
      deskSortBias: +deskSortBias.toFixed(2),
      playerRadius: officeLayout.playerRadius ?? 1.25,
      desks: desks.map((d) => ({
        id: d.id,
        sprite: d.sprite,
        archetype: d.archetype,
        x: +d.x.toFixed(2),
        y: +d.y.toFixed(2),
        w: +d.w.toFixed(2),
        h: +d.h.toFixed(2),
        relativeFootprintPoly: d.relativeFootprintPoly.map((p) => ({
          x: +p.x.toFixed(4),
          y: +p.y.toFixed(4),
        })),
      })),
    }),
    [player, playerHeightPct, footAnchorPct, deskSortBias, desks, floorPoly],
  );

  const archetypesObject = deskArchetypes;

  const layoutSnippet = useMemo(
    () => JSON.stringify({ layout: layoutObject, archetypes: archetypesObject }, null, 2),
    [layoutObject, archetypesObject],
  );

  const copyLayout = async () => {
    try {
      await navigator.clipboard.writeText(layoutSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const saveLayout = async () => {
    if (!LAYOUT_DEBUG) return;
    setSaveError(null);
    try {
      const [layoutRes, archRes] = await Promise.all([
        fetch("/api/dev/office-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layoutObject),
        }),
        fetch("/api/dev/desk-archetypes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(archetypesObject),
        }),
      ]);
      if (!layoutRes.ok || !archRes.ok) {
        const err = await (layoutRes.ok ? archRes : layoutRes)
          .json()
          .catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ||
            `Save failed (${layoutRes.status}/${archRes.status})`,
        );
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const pctFromEvent = (e: React.PointerEvent) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const startDragPlayer = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    if (debugTarget === "feet") {
      const click = pctFromEvent(e);
      const top = player.y - (playerHeightPct * footAnchorPct) / 100;
      const rel = ((click.y - top) / playerHeightPct) * 100;
      const nextAnchor = clamp(+rel.toFixed(2), 55, 105);
      setFootAnchorPct(nextAnchor);
      const next = { x: player.x, y: +click.y.toFixed(2) };
      posRef.current = next;
      setPlayer(next);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    setDebugTarget("player");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "player",
      startX: start.x,
      startY: start.y,
      orig: { x: player.x, y: player.y },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragDesk = (deskId: string) => (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedDeskId(deskId);
    setDebugTarget("desk");
    const desk = desks.find((d) => d.id === deskId);
    if (!desk) return;
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "desk",
      startX: start.x,
      startY: start.y,
      orig: { x: desk.x, y: desk.y, id: 0 },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFloorMove = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug || floorLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("floor");
    if (e.shiftKey) {
      const p = pctFromEvent(e);
      setFloorPoly((poly) => insertFootprintVertex(poly, p.x, p.y));
      return;
    }
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "floor-move",
      startX: start.x,
      startY: start.y,
      orig: {},
      origPoly: floorPoly.map((p) => ({ ...p })),
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFloorVertex = (index: number, e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug || floorLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("floor");
    if (e.altKey && floorPoly.length > 3) {
      setFloorPoly((poly) => poly.filter((_, i) => i !== index));
      return;
    }
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "floor-vertex",
      startX: start.x,
      startY: start.y,
      index,
      orig: { ...floorPoly[index] },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFootprint = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug || !selectedDesk) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("footprint");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "footprint-move",
      startX: start.x,
      startY: start.y,
      orig: {},
      origPoly: selectedAbsPoly.map((p) => ({ ...p })),
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFootprintVertex = (index: number, e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug || !selectedDesk) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("footprint");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "footprint-vertex",
      startX: start.x,
      startY: start.y,
      index,
      orig: { ...selectedAbsPoly[index] },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const cur = pctFromEvent(e);
    const dx = cur.x - drag.startX;
    const dy = cur.y - drag.startY;

    if (drag.kind === "player") {
      const next = {
        x: +(drag.orig.x + dx).toFixed(2),
        y: +(drag.orig.y + dy).toFixed(2),
      };
      posRef.current = next;
      setPlayer(next);
    } else if (drag.kind === "desk") {
      setDesks((list) =>
        list.map((d) =>
          d.id === selectedDeskId
            ? {
                ...d,
                x: +(drag.orig.x + dx).toFixed(2),
                y: +(drag.orig.y + dy).toFixed(2),
              }
            : d,
        ),
      );
    } else if (drag.kind === "floor-move" && drag.origPoly) {
      setFloorPoly(
        drag.origPoly.map((p) => ({
          x: +(p.x + dx).toFixed(2),
          y: +(p.y + dy).toFixed(2),
        })),
      );
    } else if (drag.kind === "floor-vertex") {
      setFloorPoly((poly) =>
        poly.map((p, i) =>
          i === drag.index
            ? {
                x: +(drag.orig.x + dx).toFixed(2),
                y: +(drag.orig.y + dy).toFixed(2),
              }
            : p,
        ),
      );
    } else if (drag.kind === "footprint-move" && drag.origPoly && selectedDeskId) {
      setDeskAbsPoly(
        selectedDeskId,
        drag.origPoly.map((p) => ({
          x: +(p.x + dx).toFixed(2),
          y: +(p.y + dy).toFixed(2),
        })),
      );
    } else if (drag.kind === "footprint-vertex" && selectedDeskId) {
      const next = selectedAbsPoly.map((p, i) =>
        i === drag.index
          ? {
              x: +(drag.orig.x + dx).toFixed(2),
              y: +(drag.orig.y + dy).toFixed(2),
            }
          : p,
      );
      setDeskAbsPoly(selectedDeskId, next);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const step = e.shiftKey ? 0.5 : 1.5;
    if (debugTarget === "player") {
      setPlayerHeightPct((h) => clamp(+(h + delta * step).toFixed(2), 8, 70));
    } else if (debugTarget === "desk" && selectedDeskId) {
      setDesks((list) =>
        list.map((d) =>
          d.id === selectedDeskId
            ? {
                ...d,
                w: clamp(+(d.w + delta * step).toFixed(2), 4, 50),
                h: clamp(+(d.h + delta * step).toFixed(2), 4, 55),
              }
            : d,
        ),
      );
    } else if (debugTarget === "footprint" && selectedDeskId) {
      scaleDeskFootprint(selectedDeskId, delta > 0 ? 1.06 : 0.94);
    } else if (debugTarget === "floor") {
      setFloorPoly((poly) => scalePoly(poly, delta > 0 ? 1.04 : 0.96));
    }
  };

  const playerSrc = useMemo(
    () => SPRITES.playerStand(facing, walkFrame),
    [facing, walkFrame],
  );

  const showDebug = LAYOUT_DEBUG && debug;
  const playerFootTransform = `translate(-50%, -${footAnchorPct}%)`;
  const playerImgClass =
    "pointer-events-none h-full w-auto object-contain object-bottom";

  /** Player z sits between desks they're behind and desks they're in front of. */
  const playerBehindAny = absoluteFootprints.some(({ desk, poly }) =>
    isBehindDesk(player, poly, desk, deskSortBias),
  );
  const playerZ = 30;

  const targets: { id: DebugTarget; label: string; active: string }[] = [
    { id: "player", label: "Player", active: "bg-sky-500 text-black" },
    { id: "desk", label: "Desk place", active: "bg-amber-400 text-black" },
    {
      id: "footprint",
      label: "Clip base",
      active: "bg-yellow-300 text-black",
    },
    { id: "feet", label: "Feet only", active: "bg-cyan-400 text-black" },
    { id: "floor", label: "Walk floor", active: "bg-teal-400 text-black" },
  ];

  // Stable paint among desks that share a layer (farther / lower y first).
  const desksSorted = useMemo(() => {
    return [...absoluteFootprints].sort((a, b) => {
      const aBehind = isBehindDesk(player, a.poly, a.desk, deskSortBias);
      const bBehind = isBehindDesk(player, b.poly, b.desk, deskSortBias);
      if (aBehind !== bBehind) return aBehind ? -1 : 1;
      return a.desk.y - b.desk.y;
    });
  }, [absoluteFootprints, player, deskSortBias]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#121c2c]">
      <AudioSettings />
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0a1018]"
      >
        <div
          ref={stageRef}
          className="relative overflow-hidden"
          style={{
            width: stagePx.w || "100%",
            height: stagePx.h || "100%",
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          <SpriteImg
            src={SPRITES.officeIso}
            alt="Office"
            className="absolute inset-0 h-full w-full"
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

          {showDebug && (
            <svg
              className="absolute inset-0 z-[45] h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {floorPoints && (
                  <clipPath id="office-floor-clip">
                    <polygon points={floorPoints} />
                  </clipPath>
                )}
              </defs>
              {showIsoGrid && isoGridLines.length > 0 && (
                <g
                  clipPath="url(#office-floor-clip)"
                  style={{ pointerEvents: "none" }}
                >
                  {isoGridLines.map((ln, i) => (
                    <line
                      key={`iso-${i}`}
                      x1={ln.x1}
                      y1={ln.y1}
                      x2={ln.x2}
                      y2={ln.y2}
                      stroke={ln.major ? "#94a3b8" : "#64748b"}
                      strokeWidth={ln.major ? 0.28 : 0.16}
                      strokeOpacity={ln.major ? 0.55 : 0.32}
                    />
                  ))}
                </g>
              )}
              {floorPoints && (
                <polygon
                  points={floorPoints}
                  fill={
                    debugTarget === "floor"
                      ? "rgba(52, 211, 153, 0.22)"
                      : "rgba(52, 211, 153, 0.12)"
                  }
                  stroke="#34d399"
                  strokeWidth={debugTarget === "floor" ? 0.5 : 0.35}
                  strokeDasharray="1.2 0.6"
                  className={floorLocked ? "" : "cursor-move"}
                  style={{
                    pointerEvents:
                      !floorLocked && debugTarget === "floor" ? "auto" : "none",
                  }}
                  onPointerDown={startDragFloorMove}
                />
              )}
              {absoluteFootprints.map(({ desk, poly }) => {
                const pts = inflatePoly(poly, solidRadius)
                  .map((c) => `${c.x},${c.y}`)
                  .join(" ");
                const selected = desk.id === selectedDesk?.id;
                if (!pts || selected) return null;
                return (
                  <polygon
                    key={`fp-other-${desk.id}`}
                    points={pts}
                    fill="rgba(34, 211, 238, 0.18)"
                    stroke="#67e8f9"
                    strokeWidth={0.4}
                    className="cursor-pointer"
                    style={{
                      pointerEvents:
                        debugTarget === "floor" && !floorLocked
                          ? "none"
                          : "auto",
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedDeskId(desk.id);
                      if (debugTarget === "desk") {
                        startDragDesk(desk.id)(e);
                      } else {
                        setDebugTarget("footprint");
                      }
                    }}
                  />
                );
              })}
              {selectedSolidPoints && (
                <polygon
                  points={selectedSolidPoints}
                  fill="rgba(244, 63, 94, 0.38)"
                  stroke="#fb7185"
                  strokeWidth={0.4}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {selectedPolyPoints && (
                <polygon
                  points={selectedPolyPoints}
                  fill={
                    debugTarget === "footprint"
                      ? "rgba(251, 191, 36, 0.22)"
                      : "rgba(251, 191, 36, 0.1)"
                  }
                  stroke="#fbbf24"
                  strokeWidth={debugTarget === "footprint" ? 0.5 : 0.3}
                  strokeDasharray="1 0.6"
                  className={
                    debugTarget === "footprint" || debugTarget === "desk"
                      ? "cursor-pointer"
                      : ""
                  }
                  style={{
                    pointerEvents:
                      debugTarget === "floor" && !floorLocked
                        ? "none"
                        : "auto",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (debugTarget === "desk" && selectedDeskId) {
                      startDragDesk(selectedDeskId)(e);
                      return;
                    }
                    if (e.shiftKey && selectedDeskId) {
                      const p = pctFromEvent(e);
                      setDeskAbsPoly(
                        selectedDeskId,
                        insertFootprintVertex(selectedAbsPoly, p.x, p.y),
                      );
                      return;
                    }
                    startDragFootprint(e);
                  }}
                />
              )}
              <circle
                cx={player.x}
                cy={player.y}
                r={solidRadius}
                fill="rgba(34, 211, 238, 0.25)"
                stroke="#22d3ee"
                strokeWidth={0.25}
                style={{ pointerEvents: "none" }}
              />
              {footTrail.map((t, i) => (
                <circle
                  key={`ink-${i}`}
                  cx={t.x}
                  cy={t.y}
                  r={0.35}
                  fill={t.blocked ? "#f43f5e" : "#4ade80"}
                  style={{ pointerEvents: "none" }}
                />
              ))}
              {selectedAbsPoly.length >= 3 &&
                edgesAtVertex(
                  selectedAbsPoly,
                  extremeVertex(selectedAbsPoly, "front"),
                ).map((edge, i) => (
                  <polyline
                    key={`front-e-${i}`}
                    points={`${edge.a.x},${edge.a.y + deskSortBias} ${edge.b.x},${edge.b.y + deskSortBias}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="0.85"
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                ))}
              {selectedAbsPoly.length >= 3 &&
                edgesAtVertex(
                  selectedAbsPoly,
                  extremeVertex(selectedAbsPoly, "back"),
                ).map((edge, i) => (
                  <polyline
                    key={`back-e-${i}`}
                    points={`${edge.a.x},${edge.a.y} ${edge.b.x},${edge.b.y}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    strokeDasharray="1.2 0.7"
                    style={{ pointerEvents: "none" }}
                  />
                ))}
              {selectedAbsPoly.length >= 2 &&
                (() => {
                  const xs = selectedAbsPoly.map((p) => p.x);
                  const sampleX = clamp(
                    player.x,
                    Math.min(...xs),
                    Math.max(...xs),
                  );
                  const fy =
                    (frontContourY(selectedAbsPoly, sampleX) ??
                      Math.max(...selectedAbsPoly.map((p) => p.y))) +
                    deskSortBias;
                  return (
                    <line
                      x1={sampleX - 1.5}
                      y1={fy}
                      x2={sampleX + 1.5}
                      y2={fy}
                      stroke={playerBehindAny ? "#a78bfa" : "#34d399"}
                      strokeWidth={0.4}
                      style={{ pointerEvents: "none" }}
                    />
                  );
                })()}
            </svg>
          )}

          {showDebug &&
            !floorLocked &&
            debugTarget === "floor" &&
            floorPoly.map((p, i) => (
              <button
                key={`fv-${i}`}
                type="button"
                aria-label={`Walk floor vertex ${i + 1}`}
                className="absolute z-[50] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border border-black bg-teal-300 shadow"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onPointerDown={(e) => startDragFloorVertex(i, e)}
              />
            ))}

          {showDebug &&
            debugTarget === "footprint" &&
            selectedAbsPoly.map((p, i) => (
              <button
                key={`fp-${i}`}
                type="button"
                aria-label={`Desk floor corner ${i + 1}`}
                className="absolute z-[50] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border border-black bg-amber-300 shadow"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onPointerDown={(e) => startDragFootprintVertex(i, e)}
              />
            ))}

          {/* Depth: same SNES rule as demo — north of a desk's front edge
              means that desk occludes the player (higher z). */}
          {desksSorted
            .filter(
              ({ desk, poly }) =>
                !isBehindDesk(player, poly, desk, deskSortBias),
            )
            .map(({ desk }) => (
              <div
                key={`desk-under-${desk.id}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${desk.x}%`,
                  top: `${desk.y}%`,
                  width: `${desk.w}%`,
                  height: `${desk.h}%`,
                  transform: "translate(-50%, -70%)",
                  zIndex: 20,
                }}
                title={desk.id}
              >
                <SpriteImg
                  src={DESK_SRC[desk.sprite] ?? SPRITES.deskRegular}
                  alt={desk.id}
                  className="pointer-events-none h-full w-full object-contain object-bottom"
                />
              </div>
            ))}

          <div
            className={`absolute flex flex-col items-center ${
              showDebug &&
              (debugTarget === "player" || debugTarget === "feet")
                ? "cursor-crosshair"
                : ""
            } ${
              showDebug && debugTarget === "player"
                ? "outline outline-2 outline-sky-400"
                : ""
            } ${
              showDebug && debugTarget === "feet"
                ? "outline outline-2 outline-cyan-300"
                : ""
            }`}
            style={{
              left: `${player.x}%`,
              top: `${player.y}%`,
              height: `${playerHeightPct}%`,
              transform: playerFootTransform,
              zIndex: playerZ,
              pointerEvents:
                showDebug &&
                (debugTarget === "player" || debugTarget === "feet")
                  ? "auto"
                  : "none",
            }}
            onPointerDown={startDragPlayer}
          >
            <SpriteImg
              src={playerSrc}
              className={playerImgClass}
              fallback={
                <div className="pixel-sprite h-full aspect-[2/5] border-2 border-[#0b1220] bg-[#3d6ea8]">
                  <div className="mx-auto mt-1 h-[12%] w-[55%] bg-[#e8c4a0]" />
                </div>
              }
            />
          </div>

          {desksSorted
            .filter(({ desk, poly }) =>
              isBehindDesk(player, poly, desk, deskSortBias),
            )
            .map(({ desk }) => (
              <div
                key={`desk-over-${desk.id}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${desk.x}%`,
                  top: `${desk.y}%`,
                  width: `${desk.w}%`,
                  height: `${desk.h}%`,
                  transform: "translate(-50%, -70%)",
                  zIndex: 40,
                }}
                title={desk.id}
              >
                <SpriteImg
                  src={DESK_SRC[desk.sprite] ?? SPRITES.deskRegular}
                  alt={desk.id}
                  className="pointer-events-none h-full w-full object-contain object-bottom"
                />
              </div>
            ))}
        </div>
      </div>

      {showDebug ? (
        <div className="z-50 flex max-h-[40vh] shrink-0 flex-col border-t-2 border-rose-500 bg-[#0a1018]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-900/60 px-3 py-2">
            <div className="font-pixel text-[11px] text-rose-400">
              OFFICE DEBUG · F2 · iso grid on · Desk place to drag
            </div>
            <button
              type="button"
              className="pixel-btn bg-rose-600 px-2 py-1 font-pixel text-[9px] text-white"
              onClick={() => setDebug(false)}
            >
              Close
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3 sm:flex-row">
            <div className="flex shrink-0 flex-col gap-2 sm:w-64">
              <div className="flex flex-wrap gap-1">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pixel-btn px-2 py-1 font-pixel text-[8px] ${
                      debugTarget === t.id
                        ? t.active
                        : "bg-slate-700 text-slate-200"
                    }`}
                    onClick={() => setDebugTarget(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {desks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`pixel-btn px-2 py-1 font-mono text-[8px] ${
                      d.id === selectedDeskId
                        ? "bg-amber-400 text-black"
                        : "bg-slate-700 text-slate-200"
                    }`}
                    onClick={() => {
                      setSelectedDeskId(d.id);
                      setDebugTarget("footprint");
                    }}
                  >
                    {d.id}
                  </button>
                ))}
              </div>
              {debugTarget === "floor" ? (
                <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                  {floorLocked
                    ? "Walk floor is locked so it won't steal clicks. Uncheck Lock floor to edit."
                    : "Walk floor — drag teal squares to reshape. Shift+click adds a point. Alt+click deletes."}
                </p>
              ) : (
                selectedDesk && (
                  <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                    Selected{" "}
                    <span className="text-amber-200">{selectedDesk.id}</span>.
                    Click a desk's{" "}
                    <span className="text-cyan-300">cyan base</span> to switch
                    (not the big sprite box). Drag amber corners to reshape
                    the clip.
                  </p>
                )
              )}
              <label className="flex items-center gap-2 font-mono text-[9px] text-slate-300">
                <input
                  type="checkbox"
                  checked={floorLocked}
                  onChange={(e) => setFloorLocked(e.target.checked)}
                />
                Lock floor
              </label>
              <label className="flex items-center gap-2 font-mono text-[9px] text-slate-300">
                <input
                  type="checkbox"
                  checked={showIsoGrid}
                  onChange={(e) => setShowIsoGrid(e.target.checked)}
                />
                Iso grid
              </label>
              {showIsoGrid && (
                <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
                  <span>Spacing</span>
                  <button
                    type="button"
                    className="pixel-btn bg-slate-700 px-2 py-0.5 text-[9px] text-slate-100"
                    onClick={() =>
                      setGridSpacing((s) => clamp(+(s - 0.5).toFixed(1), 1.5, 8))
                    }
                  >
                    −
                  </button>
                  <span className="text-slate-200">{gridSpacing.toFixed(1)}</span>
                  <button
                    type="button"
                    className="pixel-btn bg-slate-700 px-2 py-0.5 text-[9px] text-slate-100"
                    onClick={() =>
                      setGridSpacing((s) => clamp(+(s + 0.5).toFixed(1), 1.5, 8))
                    }
                  >
                    +
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 font-mono text-[9px] text-slate-300">
                <input
                  type="checkbox"
                  checked={probeWalk}
                  onChange={(e) => {
                    setProbeWalk(e.target.checked);
                    if (e.target.checked) setFootTrail([]);
                  }}
                />
                Live test (WASD + ink)
              </label>
              {probeWalk && (
                <button
                  type="button"
                  className="pixel-btn bg-slate-600 px-2 py-1 text-[9px] text-slate-100"
                  onClick={() => setFootTrail([])}
                >
                  Clear ink
                </button>
              )}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="pixel-btn bg-emerald-500 px-3 py-1.5 text-[10px] text-black"
                  onClick={saveLayout}
                >
                  {saved ? "Saved!" : "Save JSON"}
                </button>
                <button
                  type="button"
                  className="pixel-btn bg-slate-600 px-3 py-1.5 text-[10px] text-slate-100"
                  onClick={copyLayout}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {saveError && (
                <p className="font-mono text-[9px] text-rose-400">{saveError}</p>
              )}
              <p className="font-mono text-[8px] text-slate-500">
                Save writes office-walk-layout.json + desk-archetypes.json
              </p>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded border border-slate-700 bg-black/70 p-2 font-mono text-[9px] text-emerald-300">
              {layoutSnippet}
            </pre>
          </div>
        </div>
      ) : (
        <div className="z-20 flex shrink-0 items-center justify-between gap-3 border-t-2 border-[#0b1220] bg-[#152033]/95 px-4 py-3 pr-16 backdrop-blur-sm">
          <div>
            <h2 className="font-pixel text-sm text-amber-300">Office floor</h2>
            <p className="font-mono text-[10px] text-slate-400">
              WASD / arrows · Clock In foundation ·{" "}
              {LAYOUT_DEBUG ? "F2 layout debug" : "layout locked in prod"}
            </p>
          </div>
          <Link
            href="/"
            className="pixel-btn bg-amber-400 px-4 py-2 font-pixel text-[10px] text-[#1a2332] hover:bg-amber-300"
          >
            Title
          </Link>
        </div>
      )}
    </div>
  );
}
