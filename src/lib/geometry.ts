export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export const containsRect = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

export const rectFromPoints = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

export function boundsOf(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

type Side = 'top' | 'right' | 'bottom' | 'left';

const NORMALS: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function sidePoint(r: Rect, side: Side): Point {
  switch (side) {
    case 'top':
      return { x: r.x + r.width / 2, y: r.y };
    case 'bottom':
      return { x: r.x + r.width / 2, y: r.y + r.height };
    case 'left':
      return { x: r.x, y: r.y + r.height / 2 };
    case 'right':
      return { x: r.x + r.width, y: r.y + r.height / 2 };
  }
}

/** Attach to the pair of sides that face each other across the larger gap. */
function pickSides(a: Rect, b: Rect): [Side, Side] {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  const gapX = Math.abs(dx) - (a.width + b.width) / 2;
  const gapY = Math.abs(dy) - (a.height + b.height) / 2;
  if (gapX >= gapY) return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

/** Cubic Bezier leaving p1 along n1 and arriving at p2 against n2. */
function curve(p1: Point, n1: Point, p2: Point, n2: Point) {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const off = Math.min(Math.max(dist * 0.45, 30), 220);
  const c1 = { x: p1.x + n1.x * off, y: p1.y + n1.y * off };
  const c2 = { x: p2.x + n2.x * off, y: p2.y + n2.y * off };
  const mid = {
    x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
    y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8,
  };
  return { d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`, mid };
}

export function edgeGeometry(a: Rect, b: Rect) {
  const [sa, sb] = pickSides(a, b);
  return curve(sidePoint(a, sa), NORMALS[sa], sidePoint(b, sb), NORMALS[sb]);
}

export function pendingPath(a: Rect, p: Point) {
  const [sa] = pickSides(a, { ...p, width: 0, height: 0 });
  const n = NORMALS[sa];
  return curve(sidePoint(a, sa), n, p, { x: -n.x, y: -n.y }).d;
}
