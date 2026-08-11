"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpriteImg } from "@/components/ui/SpriteImg";
import { AudioSettings } from "@/components/ui/AudioSettings";
import { SPRITES } from "@/lib/sprites";
import { LAYOUT_DEBUG } from "@/lib/layoutDebug";
import demoLayout from "@/data/demo-layout.json";

type Pos = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Facing = "front" | "back" | "left" | "right";
type WalkFrame = "idle" | "walk1" | "walk2";
type DebugTarget =
  | "player"
  | "desk"
  | "footprint"
  | "door"
  | "floor"
  | "feet"
  | "brPlayer";

type DeskLayout = {
  id: string;
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type DragState =
  | {
      kind:
        | "player"
        | "desk"
        | "door"
        | "floor-move"
        | "footprint-move"
        | "brPlayer"
        | "feet-line";
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
    }
  | {
      kind: "door-resize";
      startX: number;
      startY: number;
      handle: "nw" | "ne" | "sw" | "se";
      orig: Rect;
    };

const OFFICE_MAP = { w: 682, h: 366 };
const BREAKROOM_MAP = { w: 500, h: 385 };

/** Largest box of `aspect` (w/h) that fits in parent. */
function fitAspect(parentW: number, parentH: number, aspect: number) {
  if (parentW <= 0 || parentH <= 0) return { w: 0, h: 0 };
  if (parentW / parentH > aspect) {
    const h = parentH;
    return { w: h * aspect, h };
  }
  const w = parentW;
  return { w, h: w / aspect };
}

/** Max Y on the polygon boundary at a given X (front contour for iso sort). */
function frontContourY(poly: Pos[], x: number): number | null {
  if (poly.length < 2) return null;
  let maxY: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    if (x < minX - 0.01 || x > maxX + 0.01) continue;
    if (Math.abs(maxX - minX) < 1e-6) {
      const y = Math.max(a.y, b.y);
      maxY = maxY == null ? y : Math.max(maxY, y);
      continue;
    }
    const t = (x - a.x) / (b.x - a.x);
    if (t < -0.01 || t > 1.01) continue;
    const y = a.y + t * (b.y - a.y);
    maxY = maxY == null ? y : Math.max(maxY, y);
  }
  return maxY;
}

/**
 * Depth sort — same rule as a SNES RPG desk:
 * - Feet south of the desk FRONT edge → draw player on top of the desk
 * - Feet north of that edge (in the desk column) → draw player under the desk
 * Collision is separate: the whole desk-floor poly blocks the feet from either side.
 */
function isBehindDesk(
  player: Pos,
  poly: Pos[],
  desk?: { x: number; w: number },
  sortBias = 0,
): boolean {
  if (poly.length < 3) return false;
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const frontTipY = Math.max(...ys);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  let zoneMin = minX;
  let zoneMax = maxX;
  if (desk) {
    zoneMin = Math.min(zoneMin, desk.x - desk.w * 0.55);
    zoneMax = Math.max(zoneMax, desk.x + desk.w * 0.55);
  }

  // Far left/right of the desk: no under-desk occlusion
  if (player.x < zoneMin - 3 || player.x > zoneMax + 3) {
    return false;
  }

  // Front edge is angled (iso). Sample it at the player's X.
  const sampleX = clamp(player.x, minX, maxX);
  const local = frontContourY(poly, sampleX);
  const frontY = (local ?? frontTipY) + sortBias;
  // On or north of the front line → behind the desk art
  return player.y <= frontY + 0.15;
}

/** Index of the southernmost (front) / northernmost (back) vertex. */
function extremeVertex(poly: Pos[], mode: "front" | "back"): number {
  let best = 0;
  for (let i = 1; i < poly.length; i++) {
    if (mode === "front" ? poly[i].y > poly[best].y : poly[i].y < poly[best].y) {
      best = i;
    }
  }
  return best;
}

/** The two edges that meet at a vertex (desk front or back "facing"). */
function edgesAtVertex(
  poly: Pos[],
  idx: number,
): { a: Pos; b: Pos }[] {
  const n = poly.length;
  if (n < 2) return [];
  const tip = poly[idx];
  const prev = poly[(idx - 1 + n) % n];
  const next = poly[(idx + 1) % n];
  return [
    { a: prev, b: tip },
    { a: tip, b: next },
  ];
}

const DESK_SRC: Record<string, string> = {
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

const m0 = demoLayout.desks[0] as {
  id: string;
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
  footprintPoly?: Pos[];
  footprint?: {
    relCx: number;
    relCy: number;
    halfAcross: number;
    halfDepth: number;
  };
};

/** Build iso parallelogram corners from legacy relative footprint. */
function isoFootprintCorners(
  desk: { x: number; y: number; w: number; h: number },
  fp: {
    relCx: number;
    relCy: number;
    halfAcross: number;
    halfDepth: number;
  },
): Pos[] {
  const cx = desk.x + fp.relCx * desk.w;
  const cy = desk.y + fp.relCy * desk.h;
  const a = fp.halfAcross * desk.w;
  const d = fp.halfDepth * desk.h;
  const corner = (across: number, depth: number) => ({
    x: +(cx + (across - depth)).toFixed(2),
    y: +(cy + (across + depth)).toFixed(2),
  });
  return [
    corner(-a, -d),
    corner(a, -d),
    corner(a, d),
    corner(-a, d),
  ];
}

const INITIAL_FOOTPRINT: Pos[] = (
  m0.footprintPoly ??
  (m0.footprint
    ? isoFootprintCorners(m0, m0.footprint)
    : isoFootprintCorners(m0, {
        relCx: 0.03,
        relCy: 0.06,
        halfAcross: 0.16,
        halfDepth: 0.105,
      }))
).map((p) => ({ ...p }));

const INITIAL_FLOOR: Pos[] = (
  (demoLayout as { floorPoly?: Pos[] }).floorPoly ?? []
).map((p) => ({ ...p }));

function inflatePoly(poly: Pos[], pad: number): Pos[] {
  const c = polyCentroid(poly);
  return poly.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad };
  });
}

/** Squared distance from point to segment AB (stage %). */
function distSqToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 <= 1e-12 ? 0 : clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

/**
 * Desk solid: inside the footprint OR within foot-radius of an edge.
 * (Point-in-tiny-poly alone lets you slip past corners.)
 */
function hitsDeskFloor(px: number, py: number, poly: Pos[], radius: number) {
  if (poly.length < 3) return false;
  if (pointInPoly(px, py, poly)) return true;
  const r = Math.max(1.25, radius);
  const r2 = r * r;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (distSqToSegment(px, py, a.x, a.y, b.x, b.y) <= r2) return true;
  }
  return false;
}

/** Insert a vertex on the closest edge (for shaping the desk solid). */
function insertFootprintVertex(poly: Pos[], x: number, y: number): Pos[] {
  if (poly.length < 2) return [...poly, { x, y }];
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const d = distSqToSegment(x, y, a.x, a.y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  const next = poly.map((p) => ({ ...p }));
  next.splice(bestI + 1, 0, { x: +x.toFixed(2), y: +y.toFixed(2) });
  return next;
}

function pointInPoly(px: number, py: number, poly: Pos[]): boolean {
  if (poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const hit =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function polyCentroid(poly: Pos[]): Pos {
  if (!poly.length) return { x: 50, y: 50 };
  const s = poly.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / poly.length, y: s.y / poly.length };
}

function scalePoly(poly: Pos[], factor: number): Pos[] {
  const c = polyCentroid(poly);
  return poly.map((p) => ({
    x: +(c.x + (p.x - c.x) * factor).toFixed(2),
    y: +(c.y + (p.y - c.y) * factor).toFixed(2),
  }));
}

function pIn(p: Pos, box: Rect) {
  return (
    p.x >= box.x &&
    p.x <= box.x + box.w &&
    p.y >= box.y &&
    p.y <= box.y + box.h
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Foot radius used for desk solids (stage %). */
function deskFootRadius() {
  return Math.max(1.25, demoLayout.playerRadius ?? 1.25);
}

const DRAFT_KEY = "sip-n-sanity:demo-layout-draft";

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Website demo: walk the office as the hero, find the breakroom,
 * end on coffee-break sprite + short pitch.
 * Dev-only layout debug: F2 — never shipped to production.
 */
export function DemoWalk() {
  const [scene, setScene] = useState<"office" | "breakroom">("office");
  const [player, setPlayer] = useState<Pos>({ ...demoLayout.playerStart });
  const [facing, setFacing] = useState<Facing>("back");
  const [walkFrame, setWalkFrame] = useState<WalkFrame>("idle");
  const [showHint, setShowHint] = useState(false);

  const [debug, setDebug] = useState(false);
  const [debugTarget, setDebugTarget] = useState<DebugTarget>("player");
  /** Walk with overlays on — see holes in the desk solid while editing. */
  const [probeWalk, setProbeWalk] = useState(false);
  const [footTrail, setFootTrail] = useState<
    { x: number; y: number; blocked: boolean }[]
  >([]);
  const [playerHeightPct, setPlayerHeightPct] = useState(
    demoLayout.playerHeightPct,
  );
  const [desk, setDesk] = useState<DeskLayout>({
    id: m0.id,
    sprite: m0.sprite,
    x: m0.x,
    y: m0.y,
    w: m0.w,
    h: m0.h,
  });
  const [door, setDoor] = useState<Rect>({ ...demoLayout.breakroom });
  const [floorPoly, setFloorPoly] = useState<Pos[]>(() =>
    INITIAL_FLOOR.map((p) => ({ ...p })),
  );
  const [footprintPoly, setFootprintPoly] = useState<Pos[]>(() =>
    INITIAL_FOOTPRINT.map((p) => ({ ...p })),
  );
  const layoutExtras = demoLayout as {
    footAnchorPct?: number;
    deskSortBias?: number;
  };
  const [footAnchorPct, setFootAnchorPct] = useState(
    layoutExtras.footAnchorPct ?? 100,
  );
  const [deskSortBias] = useState(layoutExtras.deskSortBias ?? 0);
  const [hintArrow] = useState<Pos>({
    x: demoLayout.hintArrow.x,
    y: demoLayout.hintArrow.y,
  });
  const br0 = (
    demoLayout as {
      breakroomPlayer?: { x: number; y: number; heightPct: number };
    }
  ).breakroomPlayer ?? { x: 52, y: 68, heightPct: 44 };
  const [brPlayer, setBrPlayer] = useState({
    x: br0.x,
    y: br0.y,
    heightPct: br0.heightPct,
  });
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const debugRef = useRef(false);
  const probeWalkRef = useRef(false);
  const trailAccRef = useRef(0);
  const deskRef = useRef(desk);
  const doorRef = useRef(door);
  const floorRef = useRef(floorPoly);
  const footprintRef = useRef(footprintPoly);
  const boundsRef = useRef(demoLayout.bounds);
  const entered = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const posRef = useRef<Pos>({ ...demoLayout.playerStart });
  const facingRef = useRef<Facing>("back");
  const walkPhase = useRef(0);
  const animAccum = useRef(0);
  const wasMoving = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [stagePx, setStagePx] = useState({ w: 0, h: 0 });

  // JSON is the source of truth — pick up Save / file edits even if Fast Refresh keeps state
  useEffect(() => {
    setDesk({
      id: m0.id,
      sprite: m0.sprite,
      x: m0.x,
      y: m0.y,
      w: m0.w,
      h: m0.h,
    });
    setFootprintPoly(
      (m0.footprintPoly ?? INITIAL_FOOTPRINT).map((p) => ({ ...p })),
    );
    const floor = (demoLayout as { floorPoly?: Pos[] }).floorPoly;
    if (floor?.length) {
      setFloorPoly(floor.map((p) => ({ ...p })));
    }
  }, [m0.x, m0.y, m0.w, m0.h, m0.footprintPoly, demoLayout]);

  useEffect(() => {
    deskRef.current = desk;
  }, [desk]);
  useEffect(() => {
    doorRef.current = door;
  }, [door]);
  useEffect(() => {
    floorRef.current = floorPoly;
  }, [floorPoly]);
  useEffect(() => {
    footprintRef.current = footprintPoly;
  }, [footprintPoly]);
  useEffect(() => {
    boundsRef.current = demoLayout.bounds;
  }, [demoLayout]);

  // Aspect-locked stage: map % coords stay stable across window sizes
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const map = scene === "breakroom" ? BREAKROOM_MAP : OFFICE_MAP;
    const aspect = map.w / map.h;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStagePx(fitAspect(r.width, r.height, aspect));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene, debug]);

  useEffect(() => {
    if (LAYOUT_DEBUG) clearDraft();
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

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!entered.current) setShowHint(true);
    }, demoLayout.hintDelayMs);
    return () => window.clearTimeout(t);
  }, []);

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

  // Debug nudge / scale while paused
  useEffect(() => {
    if (!LAYOUT_DEBUG || !debug) return;

    const onKey = (e: KeyboardEvent) => {
      // Live-test walk: WASD/arrows move the player, not the layout gizmos
      if (probeWalk) {
        if (e.key === "Tab") {
          e.preventDefault();
          const order: DebugTarget[] = [
            "player",
            "desk",
            "footprint",
            "feet",
            "door",
            "floor",
          ];
          setDebugTarget((t) => order[(order.indexOf(t) + 1) % order.length]);
        }
        return;
      }

      const step = e.shiftKey ? 0.25 : 1;
      const scaleStep = e.shiftKey ? 0.5 : 2;

      if (scene === "breakroom") {
        setDebugTarget("brPlayer");
        const applyMove = (dx: number, dy: number) => {
          setBrPlayer((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
        };
        const applyScale = (delta: number) => {
          setBrPlayer((p) => ({
            ...p,
            heightPct: clamp(+(p.heightPct + delta).toFixed(2), 8, 80),
          }));
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
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const order: DebugTarget[] = [
          "player",
          "desk",
          "footprint",
          "feet",
          "door",
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
        setDebugTarget("door");
        return;
      }
      if (e.key === "6") {
        setDebugTarget("floor");
        return;
      }

      const applyMove = (dx: number, dy: number) => {
        if (debugTarget === "player") {
          setPlayer((p) => {
            const next = { x: p.x + dx, y: p.y + dy };
            posRef.current = next;
            return next;
          });
        } else if (debugTarget === "desk") {
          setDesk((d) => ({ ...d, x: d.x + dx, y: d.y + dy }));
          setFootprintPoly((poly) =>
            poly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          );
        } else if (debugTarget === "footprint") {
          setFootprintPoly((poly) =>
            poly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          );
        } else if (debugTarget === "door") {
          setDoor((d) => ({ ...d, x: d.x + dx, y: d.y + dy }));
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
        } else if (debugTarget === "desk") {
          setDesk((d) => ({
            ...d,
            w: clamp(+(d.w + delta).toFixed(2), 4, 50),
            h: clamp(+(d.h + delta).toFixed(2), 4, 55),
          }));
        } else if (debugTarget === "footprint") {
          setFootprintPoly((poly) =>
            scalePoly(poly, delta > 0 ? 1.05 : 0.95),
          );
        } else if (debugTarget === "door") {
          setDoor((d) => ({
            ...d,
            w: clamp(+(d.w + delta).toFixed(2), 4, 40),
            h: clamp(+(d.h + delta).toFixed(2), 4, 40),
          }));
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
  }, [debug, debugTarget, scene, probeWalk]);

  // Smooth rAF movement
  useEffect(() => {
    if (scene !== "office") return;

    let raf = 0;
    let last = performance.now();
    const speed = demoLayout.playerSpeed;
    const radius = deskFootRadius();

    const onFloor = (x: number, y: number) => {
      const floor = floorRef.current;
      const { minX, maxX, minY, maxY } = boundsRef.current;
      if (floor.length < 3) {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      }
      return pointInPoly(x, y, floor);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { minX, maxX, minY, maxY } = boundsRef.current;

      const allowWalk = !debugRef.current || probeWalkRef.current;
      if (!entered.current && allowWalk) {
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
          const deskFloor = footprintRef.current;
          const stepX = dx * speed * dt;
          const stepY = dy * speed * dt;

          let blocked = false;
          let nx = clamp(p.x + stepX, minX, maxX);
          let ny = p.y;
          if (!onFloor(nx, ny) || hitsDeskFloor(nx, ny, deskFloor, radius)) {
            nx = p.x;
            blocked = true;
          }

          ny = clamp(p.y + stepY, minY, maxY);
          if (!onFloor(nx, ny) || hitsDeskFloor(nx, ny, deskFloor, radius)) {
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

        if (
          !probeWalkRef.current &&
          pIn(posRef.current, doorRef.current) &&
          !entered.current
        ) {
          entered.current = true;
          setShowHint(false);
          setScene("breakroom");
          setWalkFrame("idle");
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  const playerBehindDesk = isBehindDesk(
    player,
    footprintPoly,
    desk,
    deskSortBias,
  );
  const polyPoints = footprintPoly.map((c) => `${c.x},${c.y}`).join(" ");
  const fpMinX = footprintPoly.length
    ? Math.min(...footprintPoly.map((p) => p.x))
    : desk.x;
  const fpMaxX = footprintPoly.length
    ? Math.max(...footprintPoly.map((p) => p.x))
    : desk.x;
  const localFrontY =
    frontContourY(
      footprintPoly,
      clamp(player.x, fpMinX, fpMaxX),
    ) ??
    (footprintPoly.length
      ? Math.max(...footprintPoly.map((p) => p.y))
      : desk.y);
  const sortGateY = localFrontY + deskSortBias;
  const solidRadius = deskFootRadius();
  const solidPoints = inflatePoly(footprintPoly, solidRadius)
    .map((c) => `${c.x},${c.y}`)
    .join(" ");

  const layoutObject = useMemo(
    () => ({
      playerStart: { x: +player.x.toFixed(2), y: +player.y.toFixed(2) },
      playerSpeed: demoLayout.playerSpeed,
      hintDelayMs: demoLayout.hintDelayMs,
      bounds: demoLayout.bounds,
      floorPoly: floorPoly.map((p) => ({
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
      })),
      breakroom: {
        x: +door.x.toFixed(2),
        y: +door.y.toFixed(2),
        w: +door.w.toFixed(2),
        h: +door.h.toFixed(2),
      },
      hintArrow: {
        x: +hintArrow.x.toFixed(2),
        y: +hintArrow.y.toFixed(2),
      },
      playerHeightPct: +playerHeightPct.toFixed(2),
      footAnchorPct: +footAnchorPct.toFixed(2),
      deskSortBias: +deskSortBias.toFixed(2),
      breakroomPlayer: {
        x: +brPlayer.x.toFixed(2),
        y: +brPlayer.y.toFixed(2),
        heightPct: +brPlayer.heightPct.toFixed(2),
      },
      playerRadius: demoLayout.playerRadius ?? 1.2,
      desks: [
        {
          id: desk.id,
          sprite: desk.sprite,
          x: +desk.x.toFixed(2),
          y: +desk.y.toFixed(2),
          w: +desk.w.toFixed(2),
          h: +desk.h.toFixed(2),
          footprintPoly: footprintPoly.map((p) => ({
            x: +p.x.toFixed(2),
            y: +p.y.toFixed(2),
          })),
        },
      ],
    }),
    [
      player,
      playerHeightPct,
      footAnchorPct,
      deskSortBias,
      desk,
      door,
      floorPoly,
      footprintPoly,
      hintArrow,
      brPlayer,
    ],
  );

  const layoutSnippet = useMemo(
    () => JSON.stringify(layoutObject, null, 2),
    [layoutObject],
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
      const res = await fetch("/api/dev/demo-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layoutObject),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || `Save failed (${res.status})`,
        );
      }
      clearDraft();
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

  const startDragBrPlayer = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("brPlayer");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "brPlayer",
      startX: start.x,
      startY: start.y,
      orig: { x: brPlayer.x, y: brPlayer.y },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragPlayer = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();

    // Feet mode: click soles on the sprite → pivot + world feet snap there
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

  const startDragFeetLine = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("feet");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "feet-line",
      startX: start.x,
      startY: start.y,
      orig: { y: player.y, anchor: footAnchorPct, height: playerHeightPct },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragDesk = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("desk");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "desk",
      startX: start.x,
      startY: start.y,
      orig: { x: desk.x, y: desk.y },
      origPoly: footprintPoly.map((p) => ({ ...p })),
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragDoor = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("door");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "door",
      startX: start.x,
      startY: start.y,
      orig: { x: door.x, y: door.y, w: door.w, h: door.h },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragDoorHandle = (
    handle: "nw" | "ne" | "sw" | "se",
    e: React.PointerEvent,
  ) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("door");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "door-resize",
      startX: start.x,
      startY: start.y,
      handle,
      orig: { ...door },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFloorMove = (e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("floor");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "floor-move",
      startX: start.x,
      startY: start.y,
      orig: {},
      origPoly: floorPoly.map((p) => ({ ...p })),
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFloorVertex = (index: number, e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("floor");
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
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("footprint");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "footprint-move",
      startX: start.x,
      startY: start.y,
      orig: {},
      origPoly: footprintPoly.map((p) => ({ ...p })),
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const startDragFootprintVertex = (index: number, e: React.PointerEvent) => {
    if (!LAYOUT_DEBUG || !debug) return;
    e.preventDefault();
    e.stopPropagation();
    setDebugTarget("footprint");
    const start = pctFromEvent(e);
    dragRef.current = {
      kind: "footprint-vertex",
      startX: start.x,
      startY: start.y,
      index,
      orig: { ...footprintPoly[index] },
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !debug) return;
    const cur = pctFromEvent(e);
    const dx = cur.x - drag.startX;
    const dy = cur.y - drag.startY;

    if (drag.kind === "player") {
      const next = { x: drag.orig.x + dx, y: drag.orig.y + dy };
      posRef.current = next;
      setPlayer(next);
    } else if (drag.kind === "brPlayer") {
      setBrPlayer((p) => ({
        ...p,
        x: drag.orig.x + dx,
        y: drag.orig.y + dy,
      }));
    } else if (drag.kind === "desk") {
      setDesk((d) => ({ ...d, x: drag.orig.x + dx, y: drag.orig.y + dy }));
      if (drag.origPoly) {
        setFootprintPoly(
          drag.origPoly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        );
      }
    } else if (drag.kind === "door") {
      setDoor((d) => ({ ...d, x: drag.orig.x + dx, y: drag.orig.y + dy }));
    } else if (drag.kind === "door-resize") {
      const o = drag.orig;
      let { x, y, w, h } = o;
      if (drag.handle.includes("e")) w = clamp(o.w + dx, 4, 40);
      if (drag.handle.includes("s")) h = clamp(o.h + dy, 4, 40);
      if (drag.handle.includes("w")) {
        w = clamp(o.w - dx, 4, 40);
        x = o.x + (o.w - w);
      }
      if (drag.handle.includes("n")) {
        h = clamp(o.h - dy, 4, 40);
        y = o.y + (o.h - h);
      }
      setDoor({
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        w: +w.toFixed(2),
        h: +h.toFixed(2),
      });
    } else if (drag.kind === "floor-move" && drag.origPoly) {
      setFloorPoly(
        drag.origPoly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      );
    } else if (drag.kind === "floor-vertex") {
      setFloorPoly((poly) =>
        poly.map((p, i) =>
          i === drag.index
            ? { x: drag.orig.x + dx, y: drag.orig.y + dy }
            : p,
        ),
      );
    } else if (drag.kind === "footprint-move" && drag.origPoly) {
      setFootprintPoly(
        drag.origPoly.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      );
    } else if (drag.kind === "footprint-vertex") {
      setFootprintPoly((poly) =>
        poly.map((p, i) =>
          i === drag.index
            ? { x: drag.orig.x + dx, y: drag.orig.y + dy }
            : p,
        ),
      );
    } else if (drag.kind === "feet-line") {
      // Drag line onto visual soles: world feet + anchor update together
      const lineY = drag.orig.y + dy;
      const top =
        drag.orig.y - (drag.orig.height * drag.orig.anchor) / 100;
      const rel = ((lineY - top) / drag.orig.height) * 100;
      setFootAnchorPct(clamp(+rel.toFixed(2), 55, 105));
      const next = { x: posRef.current.x, y: +lineY.toFixed(2) };
      posRef.current = next;
      setPlayer(next);
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
    if (scene === "breakroom" || debugTarget === "brPlayer") {
      setBrPlayer((p) => ({
        ...p,
        heightPct: clamp(+(p.heightPct + delta * step).toFixed(2), 8, 80),
      }));
      return;
    }
    if (debugTarget === "player") {
      setPlayerHeightPct((h) => clamp(+(h + delta * step).toFixed(2), 8, 70));
    } else if (debugTarget === "desk") {
      setDesk((d) => ({
        ...d,
        w: clamp(+(d.w + delta * step).toFixed(2), 4, 50),
        h: clamp(+(d.h + delta * step).toFixed(2), 4, 55),
      }));
    } else if (debugTarget === "footprint") {
      setFootprintPoly((poly) => scalePoly(poly, delta > 0 ? 1.06 : 0.94));
    } else if (debugTarget === "door") {
      setDoor((d) => ({
        ...d,
        w: clamp(+(d.w + delta * step).toFixed(2), 4, 40),
        h: clamp(+(d.h + delta * step).toFixed(2), 4, 40),
      }));
    } else if (debugTarget === "floor") {
      setFloorPoly((poly) => scalePoly(poly, delta > 0 ? 1.04 : 0.96));
    }
  };

  const playerSrc = useMemo(
    () => SPRITES.playerStand(facing, walkFrame),
    [facing, walkFrame],
  );

  // Large z gap + DOM order (below). Opacity/will-change on sprites
  // was breaking stacking vs the desk.
  const deskZ = playerBehindDesk ? 40 : 20;
  const playerZ = playerBehindDesk ? 20 : 40;
  const showDebug = LAYOUT_DEBUG && debug;
  const playerFootTransform = `translate(-50%, -${footAnchorPct}%)`;
  const playerImgClass =
    "pointer-events-none h-full w-auto object-contain object-bottom";

  if (scene === "breakroom") {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d1520]">
        <AudioSettings />
        <div
          ref={viewportRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
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
              src={SPRITES.breakroomIso}
              alt="Break room"
              className="absolute inset-0 h-full w-full"
              fallback={
                <div className="absolute inset-0 bg-gradient-to-b from-[#3a516e] to-[#1a2740]" />
              }
            />
            <div
              className={`absolute z-10 flex flex-col items-center ${
                showDebug ? "cursor-move outline outline-2 outline-sky-400" : ""
              }`}
              style={{
                left: `${brPlayer.x}%`,
                top: `${brPlayer.y}%`,
                height: `${brPlayer.heightPct}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: showDebug ? "auto" : "none",
              }}
              onPointerDown={startDragBrPlayer}
            >
              <SpriteImg
                src={SPRITES.playerCoffeeBreak}
                alt="Coffee break"
                className="pointer-events-none h-full w-auto object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>

        {showDebug ? (
          <div className="z-50 flex max-h-[36vh] shrink-0 flex-col border-t-2 border-rose-500 bg-[#0a1018]">
            <div className="flex items-center justify-between gap-2 border-b border-rose-900/60 px-3 py-2">
              <div className="font-pixel text-[11px] text-rose-400">
                DEBUG · BREAK ROOM · F2 to exit
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
              <div className="flex shrink-0 flex-col gap-2 sm:w-56">
                <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                  Drag player · Arrows move · [ ] / wheel scale
                </p>
                <span className="font-mono text-[9px] text-sky-200">
                  x {brPlayer.x.toFixed(1)} y {brPlayer.y.toFixed(1)} · h{" "}
                  {brPlayer.heightPct.toFixed(1)}%
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="pixel-btn bg-emerald-500 px-3 py-1.5 text-[10px] text-black"
                    onClick={saveLayout}
                  >
                    {saved ? "Saved to JSON!" : "Save to JSON"}
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
                  <p className="font-mono text-[9px] text-rose-400">
                    {saveError}
                  </p>
                )}
              </div>
              <pre className="min-h-0 flex-1 overflow-auto rounded border border-slate-700 bg-black/70 p-2 font-mono text-[9px] text-emerald-300">
                {layoutSnippet}
              </pre>
            </div>
          </div>
        ) : (
          <div className="z-20 shrink-0 border-t-2 border-[#0b1220] bg-[#152033]/95 px-4 py-5 backdrop-blur-sm sm:px-6 sm:py-6">
            <h2 className="mb-3 font-pixel text-base text-amber-300 sm:text-lg">
              SIP-N-Sanity — Demo complete
            </h2>
            <p className="mb-4 max-w-3xl font-mono text-sm leading-relaxed text-slate-200 sm:text-base sm:leading-7">
              You survived long enough to find the break room. The full game is
              a 9-to-5 VoIP support shift: balance Sanity, CSAT, and the ticket
              queue, dodge bathroom luck, lunch sneak, typing outages, the
              Office Witch, and one coworker who is definitely Santa (nobody
              mentions it). More desks, clones, and chaos coming soon.
            </p>
            <Link
              href="/"
              className="pixel-btn inline-block bg-amber-400 px-5 py-2.5 font-pixel text-xs text-[#1a2332] hover:bg-amber-300 sm:text-[11px]"
            >
              Back to title
            </Link>
          </div>
        )}
      </div>
    );
  }

  const floorPoints = floorPoly.map((c) => `${c.x},${c.y}`).join(" ");

  const targets: { id: DebugTarget; label: string; active: string }[] = [
    { id: "player", label: "Player", active: "bg-sky-500 text-black" },
    { id: "desk", label: "Desk", active: "bg-amber-400 text-black" },
    { id: "footprint", label: "Desk solid", active: "bg-yellow-300 text-black" },
    { id: "feet", label: "Feet only", active: "bg-cyan-400 text-black" },
    { id: "door", label: "Door exit", active: "bg-emerald-400 text-black" },
    { id: "floor", label: "Walk floor", active: "bg-teal-400 text-black" },
  ];

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
            className={`absolute inset-0 h-full w-full ${
              debugTarget === "footprint" || debugTarget === "floor"
                ? "z-[20]"
                : "z-[2]"
            }`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
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
                className={debugTarget === "floor" ? "cursor-move" : ""}
                style={{
                  pointerEvents: debugTarget === "floor" ? "auto" : "none",
                }}
                onPointerDown={startDragFloorMove}
              />
            )}
            {/* Magenta = REAL blocked solid (poly + foot radius). Yellow = editable shape. */}
            {solidPoints && (
              <polygon
                points={solidPoints}
                fill="rgba(244, 63, 94, 0.38)"
                stroke="#fb7185"
                strokeWidth={0.35}
                style={{ pointerEvents: "none" }}
              />
            )}
            <polygon
              points={polyPoints}
              fill={
                debugTarget === "footprint"
                  ? "rgba(251, 191, 36, 0.25)"
                  : "rgba(251, 191, 36, 0.12)"
              }
              stroke="#fbbf24"
              strokeWidth={debugTarget === "footprint" ? 0.55 : 0.35}
              strokeDasharray="1 0.6"
              className={debugTarget === "footprint" ? "cursor-move" : ""}
              style={{
                pointerEvents: debugTarget === "footprint" ? "auto" : "none",
              }}
              onPointerDown={(e) => {
                if (e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  const p = pctFromEvent(e);
                  setFootprintPoly((poly) =>
                    insertFootprintVertex(poly, p.x, p.y),
                  );
                  return;
                }
                startDragFootprint(e);
              }}
            />
            {/* Foot radius at player — what actually bumps the desk */}
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
            {/* Angled desk FRONT (your red line) + BACK — not a flat horizontal gate */}
            {footprintPoly.length >= 3 &&
              edgesAtVertex(
                footprintPoly,
                extremeVertex(footprintPoly, "front"),
              ).map((e, i) => (
                <polyline
                  key={`front-e-${i}`}
                  points={`${e.a.x},${e.a.y + deskSortBias} ${e.b.x},${e.b.y + deskSortBias}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="0.85"
                  strokeLinecap="round"
                  style={{ pointerEvents: "none" }}
                />
              ))}
            {footprintPoly.length >= 3 &&
              edgesAtVertex(
                footprintPoly,
                extremeVertex(footprintPoly, "back"),
              ).map((e, i) => (
                <polyline
                  key={`back-e-${i}`}
                  points={`${e.a.x},${e.a.y} ${e.b.x},${e.b.y}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="0.65"
                  strokeLinecap="round"
                  strokeDasharray="1.2 0.7"
                  style={{ pointerEvents: "none" }}
                />
              ))}
          </svg>
        )}

        {/* Floor vertex handles */}
        {showDebug &&
          debugTarget === "floor" &&
          floorPoly.map((p, i) => (
            <button
              key={`fv-${i}`}
              type="button"
              aria-label={`Floor vertex ${i + 1}`}
              className="absolute z-[22] h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border border-black bg-teal-300 shadow"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onPointerDown={(e) => startDragFloorVertex(i, e)}
            />
          ))}

        {/* Desk-floor corner handles — same point editing as walk floor */}
        {showDebug &&
          debugTarget === "footprint" &&
          footprintPoly.map((p, i) => (
            <button
              key={`fp-${i}`}
              type="button"
              aria-label={`Desk floor corner ${i + 1}`}
              className="absolute z-[22] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border border-black bg-amber-300 shadow"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onPointerDown={(e) => startDragFootprintVertex(i, e)}
            />
          ))}

        {/* Desk + player: DOM order is the depth sort (later = in front).
            Feet world-pos = footAnchorPct down the sprite box. */}
        {playerBehindDesk ? (
          <>
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
            <div
              className={`absolute ${
                showDebug && debugTarget === "desk"
                  ? "cursor-move"
                  : "pointer-events-none"
              } ${
                showDebug && debugTarget === "desk"
                  ? "outline outline-2 outline-amber-400"
                  : ""
              }`}
              style={{
                left: `${desk.x}%`,
                top: `${desk.y}%`,
                width: `${desk.w}%`,
                height: `${desk.h}%`,
                transform: "translate(-50%, -70%)",
                zIndex: deskZ,
                pointerEvents:
                  showDebug && debugTarget === "desk" ? "auto" : "none",
              }}
              title="Manager desk"
              onPointerDown={startDragDesk}
            >
              <SpriteImg
                src={DESK_SRC[desk.sprite] ?? SPRITES.deskManager}
                className="pointer-events-none h-full w-full object-contain object-bottom"
                fallback={
                  <div className="h-full w-full border-2 border-[#0b1220] bg-[#6b4f2e]/90" />
                }
              />
            </div>
          </>
        ) : (
          <>
            <div
              className={`absolute ${
                showDebug && debugTarget === "desk"
                  ? "cursor-move"
                  : "pointer-events-none"
              } ${
                showDebug && debugTarget === "desk"
                  ? "outline outline-2 outline-amber-400"
                  : ""
              }`}
              style={{
                left: `${desk.x}%`,
                top: `${desk.y}%`,
                width: `${desk.w}%`,
                height: `${desk.h}%`,
                transform: "translate(-50%, -70%)",
                zIndex: deskZ,
                pointerEvents:
                  showDebug && debugTarget === "desk" ? "auto" : "none",
              }}
              title="Manager desk"
              onPointerDown={startDragDesk}
            >
              <SpriteImg
                src={DESK_SRC[desk.sprite] ?? SPRITES.deskManager}
                className="pointer-events-none h-full w-full object-contain object-bottom"
                fallback={
                  <div className="h-full w-full border-2 border-[#0b1220] bg-[#6b4f2e]/90" />
                }
              />
            </div>
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
          </>
        )}

        {/* Feet marker + plain labels (debug) */}
        {showDebug && (
          <>
            <div
              className="pointer-events-none absolute z-[30] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-sky-400"
              style={{ left: `${player.x}%`, top: `${player.y}%` }}
              title="Player feet"
            />
            {footprintPoly.length >= 3 && (
              <div
                className="pointer-events-none absolute z-[30] -translate-x-1/2 -translate-y-1/2 bg-black/80 px-1 font-mono text-[8px] text-red-300"
                style={{
                  left: `${footprintPoly[extremeVertex(footprintPoly, "front")].x}%`,
                  top: `${footprintPoly[extremeVertex(footprintPoly, "front")].y + deskSortBias}%`,
                }}
              >
                DESK FRONT · {playerBehindDesk ? "under desk" : "over desk"}
              </div>
            )}
            {(debugTarget === "feet" || debugTarget === "footprint") && (
              <div
                role="presentation"
                className="absolute z-[31] cursor-ns-resize"
                style={{
                  left: 0,
                  right: 0,
                  top: `${player.y}%`,
                  height: 14,
                  transform: "translateY(-50%)",
                }}
                onPointerDown={startDragFeetLine}
              >
                <div className="absolute inset-x-0 top-1/2 border-t-2 border-cyan-400" />
                <span className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/80 px-1 font-mono text-[8px] text-cyan-300">
                  YOUR FEET {player.y.toFixed(1)} — cannot enter magenta
                </span>
              </div>
            )}
          </>
        )}

        {/* Breakroom door exit */}
        <div
          className={`absolute z-[9] border-2 border-dashed ${
            showDebug
              ? debugTarget === "door"
                ? "cursor-move border-emerald-300 bg-emerald-400/25"
                : "border-emerald-400/70 bg-emerald-400/10"
              : "pointer-events-none border-emerald-400/35 bg-emerald-400/5"
          }`}
          style={{
            left: `${door.x}%`,
            top: `${door.y}%`,
            width: `${door.w}%`,
            height: `${door.h}%`,
            pointerEvents: showDebug ? "auto" : "none",
          }}
          onPointerDown={startDragDoor}
        >
          {showDebug && (
            <>
              <span className="pointer-events-none absolute left-1 top-0.5 font-mono text-[8px] text-emerald-100">
                door exit
              </span>
              {(
                [
                  ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"],
                  ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"],
                  ["sw", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"],
                  ["se", "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"],
                ] as const
              ).map(([handle, cls]) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={`Resize door ${handle}`}
                  className={`absolute z-10 h-3 w-3 border border-black bg-emerald-200 ${cls}`}
                  onPointerDown={(e) => startDragDoorHandle(handle, e)}
                />
              ))}
            </>
          )}
        </div>

        {showHint && !showDebug && (
          <div
            className="anim-demo-arrow pointer-events-none absolute z-[8]"
            style={{
              left: `${hintArrow.x}%`,
              top: `${hintArrow.y}%`,
              transform: "translate(-50%, -50%) rotate(8deg)",
            }}
            aria-hidden
          >
            <div
              className="h-0 w-0 border-y-[14px] border-y-transparent border-l-[28px] border-l-red-500"
              style={{ filter: "drop-shadow(0 0 4px #f00)" }}
            />
          </div>
        )}
        </div>
      </div>

      {/* Bottom chrome: player hint OR full debug dock (map flex-shrinks above) */}
      {showDebug ? (
        <div className="z-50 flex max-h-[42vh] shrink-0 flex-col border-t-2 border-rose-500 bg-[#0a1018] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-2 border-b border-rose-900/60 px-3 py-2">
            <div className="font-pixel text-[11px] text-rose-400">
              DEBUG · PAUSED · F2 to exit
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
            <div className="flex shrink-0 flex-col gap-2 sm:w-56">
              <div className="flex flex-wrap gap-1">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pixel-btn px-2 py-1 text-[9px] ${
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
              <p className="font-mono text-[9px] leading-relaxed text-slate-300">
                <span className="text-amber-300">How the desk works:</span>
                <br />
                1. Magenta = desk on the floor. Your cyan feet cannot go in.
                <br />
                2. Thick red = desk FRONT (match the desk legs). From the
                front: you draw over the desk until feet hit that edge, then
                stop. From behind: you draw under the desk; amber back edge
                also blocks.
              </p>
              <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                Tab · 1–6 · Arrows nudge · [ ] scale
                {debugTarget === "footprint" &&
                  " · drag amber corners so RED FRONT matches the desk base you care about · Shift+click adds a corner · Live test"}
                {debugTarget === "feet" &&
                  " · only if soles look wrong: drag cyan onto shoes"}
                {debugTarget === "floor" && " · green = walkable floor"}
                {debugTarget === "door" && " · drag / resize door exit"}
              </p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={`pixel-btn px-2 py-1.5 text-[9px] ${
                    probeWalk
                      ? "bg-fuchsia-400 text-black"
                      : "bg-slate-700 text-slate-200"
                  }`}
                  onClick={() => {
                    setProbeWalk((v) => !v);
                    setDebugTarget("footprint");
                  }}
                >
                  {probeWalk ? "Live test ON" : "Live test"}
                </button>
                <button
                  type="button"
                  className="pixel-btn bg-slate-700 px-2 py-1.5 text-[9px] text-slate-200"
                  onClick={() => setFootTrail([])}
                >
                  Clear ink
                </button>
              </div>
              {probeWalk && (
                <span className="font-mono text-[9px] text-fuchsia-200">
                  WASD — green walked, red blocked. Pull corners until you
                  cannot cross the desk base. Save.
                </span>
              )}
              {(debugTarget === "footprint" || debugTarget === "feet") && (
                <span className="font-mono text-[9px] text-cyan-200">
                  feet {player.y.toFixed(1)} · front {sortGateY.toFixed(1)} ·{" "}
                  {playerBehindDesk
                    ? "drawing UNDER desk"
                    : "drawing OVER desk"}
                </span>
              )}
              {debugTarget === "door" && (
                <span className="font-mono text-[9px] text-emerald-200">
                  x {door.x.toFixed(1)} y {door.y.toFixed(1)} · w{" "}
                  {door.w.toFixed(1)} h {door.h.toFixed(1)}
                </span>
              )}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="pixel-btn bg-emerald-500 px-3 py-1.5 text-[10px] text-black"
                  onClick={saveLayout}
                >
                  {saved ? "Saved to JSON!" : "Save to JSON"}
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
                Save writes data/demo-layout.json — that file is the demo
                default on reload.
              </p>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded border border-slate-700 bg-black/70 p-2 font-mono text-[9px] text-emerald-300">
              {layoutSnippet}
            </pre>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t-2 border-[#0b1220] bg-[#152033] px-3 py-2">
          <p className="font-pixel text-[10px] text-amber-200">
            Walk around the Livetel floor. Find the break room.
          </p>
          <p className="font-mono text-[9px] text-slate-500">
            WASD / arrows ·{" "}
            <Link href="/" className="text-sky-400 underline">
              Title
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
