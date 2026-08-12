/**
 * Shared desk solid + iso depth-sort helpers for office walk / demo.
 * Stage coords are percentages of the map stage (0–100).
 */

export type Pos = { x: number; y: number };

export type DeskBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Sprite box anchor: translate(-50%, -anchorY%) — manager/employee use 70. */
export const DESK_ANCHOR_Y = 0.7;

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function pointInPoly(px: number, py: number, poly: Pos[]): boolean {
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

export function polyCentroid(poly: Pos[]): Pos {
  if (!poly.length) return { x: 50, y: 50 };
  const s = poly.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / poly.length, y: s.y / poly.length };
}

export function inflatePoly(poly: Pos[], pad: number): Pos[] {
  const c = polyCentroid(poly);
  return poly.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * pad, y: p.y + (dy / len) * pad };
  });
}

export function scalePoly(poly: Pos[], factor: number): Pos[] {
  const c = polyCentroid(poly);
  return poly.map((p) => ({
    x: +(c.x + (p.x - c.x) * factor).toFixed(2),
    y: +(c.y + (p.y - c.y) * factor).toFixed(2),
  }));
}

export type Aabb = { x: number; y: number; w: number; h: number };
export type BoxHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function polyAabb(poly: Pos[]): Aabb {
  if (!poly.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Stretch a poly so its AABB becomes `to` (independent width / height). */
export function remapPolyToAabb(poly: Pos[], from: Aabb, to: Aabb): Pos[] {
  const sx = Math.abs(from.w) < 1e-6 ? 1 : to.w / from.w;
  const sy = Math.abs(from.h) < 1e-6 ? 1 : to.h / from.h;
  return poly.map((p) => ({
    x: +(to.x + (p.x - from.x) * sx).toFixed(4),
    y: +(to.y + (p.y - from.y) * sy).toFixed(4),
  }));
}

export function resizeAabb(
  box: Aabb,
  handle: BoxHandle,
  dx: number,
  dy: number,
  minSize = 1.5,
): Aabb {
  let x1 = box.x;
  let y1 = box.y;
  let x2 = box.x + box.w;
  let y2 = box.y + box.h;
  if (handle === "nw" || handle === "w" || handle === "sw") x1 = box.x + dx;
  if (handle === "ne" || handle === "e" || handle === "se") x2 = box.x + box.w + dx;
  if (handle === "nw" || handle === "n" || handle === "ne") y1 = box.y + dy;
  if (handle === "sw" || handle === "s" || handle === "se") y2 = box.y + box.h + dy;
  if (x2 - x1 < minSize) {
    if (handle === "nw" || handle === "w" || handle === "sw") x1 = x2 - minSize;
    else x2 = x1 + minSize;
  }
  if (y2 - y1 < minSize) {
    if (handle === "nw" || handle === "n" || handle === "ne") y1 = y2 - minSize;
    else y2 = y1 + minSize;
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Squared distance from point to segment AB (stage %). */
export function distSqToSegment(
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

/** Max Y on the polygon boundary at a given X (front contour for iso sort). */
export function frontContourY(poly: Pos[], x: number): number | null {
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
 * Depth sort — SNES RPG desk rule:
 * feet south of FRONT edge → over desk; north (in column) → under desk.
 */
export function isBehindDesk(
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

  if (player.x < zoneMin - 3 || player.x > zoneMax + 3) {
    return false;
  }

  const sampleX = clamp(player.x, minX, maxX);
  const local = frontContourY(poly, sampleX);
  const frontY = (local ?? frontTipY) + sortBias;
  return player.y <= frontY + 0.15;
}

/**
 * Desk solid: inside the footprint OR within foot-radius of an edge.
 */
export function hitsDeskFloor(
  px: number,
  py: number,
  poly: Pos[],
  radius: number,
) {
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

export function hitsAnyDeskFloor(
  px: number,
  py: number,
  polys: Pos[][],
  radius: number,
) {
  return polys.some((poly) => hitsDeskFloor(px, py, poly, radius));
}

/** Insert a vertex on the closest edge (for shaping the desk solid). */
export function insertFootprintVertex(
  poly: Pos[],
  x: number,
  y: number,
): Pos[] {
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

export function extremeVertex(poly: Pos[], mode: "front" | "back"): number {
  let best = 0;
  for (let i = 1; i < poly.length; i++) {
    if (
      mode === "front" ? poly[i].y > poly[best].y : poly[i].y < poly[best].y
    ) {
      best = i;
    }
  }
  return best;
}

export function edgesAtVertex(
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

/** Desk sprite box top-left in stage % (with -50% / -anchorY% transform). */
export function deskBoxOrigin(
  desk: DeskBox,
  anchorY = DESK_ANCHOR_Y,
): Pos {
  return {
    x: desk.x - desk.w * 0.5,
    y: desk.y - desk.h * anchorY,
  };
}

/** Relative (0–1 in desk box) → absolute stage %. */
export function relativeToAbsoluteFootprint(
  desk: DeskBox,
  relativePoly: Pos[],
  anchorY = DESK_ANCHOR_Y,
): Pos[] {
  const origin = deskBoxOrigin(desk, anchorY);
  return relativePoly.map((p) => ({
    x: +(origin.x + p.x * desk.w).toFixed(4),
    y: +(origin.y + p.y * desk.h).toFixed(4),
  }));
}

/** Absolute stage % → relative (0–1 in desk box). */
export function absoluteToRelativeFootprint(
  desk: DeskBox,
  absolutePoly: Pos[],
  anchorY = DESK_ANCHOR_Y,
): Pos[] {
  const origin = deskBoxOrigin(desk, anchorY);
  return absolutePoly.map((p) => ({
    x: +((p.x - origin.x) / desk.w).toFixed(4),
    y: +((p.y - origin.y) / desk.h).toFixed(4),
  }));
}

export function deskFootRadius(playerRadius?: number) {
  return Math.max(1.25, playerRadius ?? 1.25);
}
