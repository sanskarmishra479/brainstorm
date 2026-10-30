import { useBoard } from '../store/board';
import type { Viewport } from '../types';
import { boundsOf, clamp, type Rect } from './geometry';
import { rectOf } from './nodes';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
const TOPBAR_HEIGHT = 48;

/** Last known pointer position over the canvas, used to place pasted content. */
export const pointer = { x: 0, y: 0, inside: false };

/** Scale the viewport by `factor`, keeping the screen point (sx, sy) fixed. */
export function zoomAround(v: Viewport, sx: number, sy: number, factor: number): Viewport {
  const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / v.zoom;
  return { zoom, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k };
}

/** The canvas fills the window, so client coordinates are screen coordinates. */
export function screenToWorld(sx: number, sy: number) {
  const v = useBoard.getState().viewport;
  return { x: (sx - v.x) / v.zoom, y: (sy - v.y) / v.zoom };
}

const screenCenter = () => ({ x: window.innerWidth / 2, y: (window.innerHeight + TOPBAR_HEIGHT) / 2 });

export const worldCenter = () => {
  const c = screenCenter();
  return screenToWorld(c.x, c.y);
};

/** Where new or pasted content should go: under the pointer if it's on the canvas, else the screen center. */
export const placementPoint = () => (pointer.inside ? screenToWorld(pointer.x, pointer.y) : worldCenter());

let frame = 0;

export function stopAnimation() {
  cancelAnimationFrame(frame);
}

export function animateTo(target: Viewport, duration = 280) {
  stopAnimation();
  const from = useBoard.getState().viewport;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 3);
    useBoard.getState().setViewport({
      x: from.x + (target.x - from.x) * e,
      y: from.y + (target.y - from.y) * e,
      zoom: from.zoom + (target.zoom - from.zoom) * e,
    });
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

export function zoomBy(factor: number) {
  const c = screenCenter();
  animateTo(zoomAround(useBoard.getState().viewport, c.x, c.y, factor));
}

export function resetZoom() {
  zoomBy(1 / useBoard.getState().viewport.zoom);
}

/** Viewport that frames `rect` on screen, never zooming in past `maxZoom`. */
export function viewportFor(rect: Rect, maxZoom = 1.2, pad = 80): Viewport {
  const c = screenCenter();
  const availW = Math.max(100, window.innerWidth - pad * 2);
  const availH = Math.max(100, window.innerHeight - TOPBAR_HEIGHT - pad * 2);
  const zoom = clamp(Math.min(availW / (rect.width || 1), availH / (rect.height || 1)), MIN_ZOOM, maxZoom);
  return { zoom, x: c.x - (rect.x + rect.width / 2) * zoom, y: c.y - (rect.y + rect.height / 2) * zoom };
}

/** Frame all content without animating, once freshly loaded nodes have been measured. */
export function fitAfterLayout(maxZoom = 1) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const b = boundsOf(Object.values(useBoard.getState().nodes).map(rectOf));
      if (b) useBoard.getState().setViewport(viewportFor(b, maxZoom));
    }),
  );
}

export function fitToContent() {
  const b = boundsOf(Object.values(useBoard.getState().nodes).map(rectOf));
  if (!b) {
    const c = screenCenter();
    animateTo({ x: c.x, y: c.y, zoom: 1 });
    return;
  }
  animateTo(viewportFor(b));
}

/** Pan (and zoom in if very far out) so the given node is centered. */
export function focusNode(id: string) {
  const n = useBoard.getState().nodes[id];
  if (!n) return;
  const zoom = Math.max(useBoard.getState().viewport.zoom, 0.8);
  const c = screenCenter();
  animateTo({ zoom, x: c.x - (n.x + n.width / 2) * zoom, y: c.y - (n.y + n.height / 2) * zoom });
}
