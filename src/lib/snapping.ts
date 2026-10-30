import type { Guide } from '../store/board';
import type { Rect } from './geometry';

export const GRID = 24;
const THRESHOLD = 6; // screen pixels

const xStops = (r: Rect) => [r.x, r.x + r.width / 2, r.x + r.width];
const yStops = (r: Rect) => [r.y, r.y + r.height / 2, r.y + r.height];

/** The smallest correction that lines up one of `own` with one of `targets`, if within `limit`. */
function nearest(own: number[], targets: number[], limit: number) {
  let best: number | null = null;
  for (const a of own)
    for (const b of targets) {
      const d = b - a;
      if (Math.abs(d) <= limit && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  return best;
}

/**
 * Adjust a drag offset so the moving box lines up with the edges or centers
 * of other nodes, falling back to the grid when enabled. Returns the guide
 * lines to draw for every alignment that results.
 */
export function snapMove(moving: Rect, dx: number, dy: number, others: Rect[], zoom: number, grid: boolean) {
  const limit = THRESHOLD / zoom;
  const moved = { ...moving, x: moving.x + dx, y: moving.y + dy };

  const sx = nearest(xStops(moved), others.flatMap(xStops), limit);
  const sy = nearest(yStops(moved), others.flatMap(yStops), limit);
  if (sx !== null) dx += sx;
  else if (grid) dx += Math.round(moved.x / GRID) * GRID - moved.x;
  if (sy !== null) dy += sy;
  else if (grid) dy += Math.round(moved.y / GRID) * GRID - moved.y;

  const final = { ...moving, x: moving.x + dx, y: moving.y + dy };
  const guides: Guide[] = [];
  const close = (a: number, b: number) => Math.abs(a - b) < 0.5;

  if (sx !== null) {
    for (const x of xStops(final)) {
      const aligned = others.filter((o) => xStops(o).some((ox) => close(ox, x)));
      if (aligned.length === 0) continue;
      const ys = [final, ...aligned].flatMap((r) => [r.y, r.y + r.height]);
      guides.push({ axis: 'x', pos: x, start: Math.min(...ys), end: Math.max(...ys) });
    }
  }
  if (sy !== null) {
    for (const y of yStops(final)) {
      const aligned = others.filter((o) => yStops(o).some((oy) => close(oy, y)));
      if (aligned.length === 0) continue;
      const xs = [final, ...aligned].flatMap((r) => [r.x, r.x + r.width]);
      guides.push({ axis: 'y', pos: y, start: Math.min(...xs), end: Math.max(...xs) });
    }
  }
  return { dx, dy, guides };
}
