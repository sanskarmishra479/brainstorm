import type { PointerEvent as ReactPointerEvent } from 'react';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { screenToWorld } from './camera';
import { boundsOf, clamp, type Rect } from './geometry';
import { CARD_WIDTH, createCard, expandWithContents, rectOf, SIZE_LIMITS } from './nodes';
import { trackPointer } from './pointer';
import { snapMove } from './snapping';

/** Set while a drag is moving nodes, so a click at the end of it can be ignored. */
export let lastDragMoved = false;

/**
 * Press on a node: select it, then drag it (and the rest of the selection,
 * including anything inside selected groups) once the pointer moves.
 * Snaps to other nodes' edges and centers (hold Alt to move freely).
 */
export function startNodeDrag(e: ReactPointerEvent, id: string) {
  const s = useBoard.getState();
  lastDragMoved = false;
  if (e.shiftKey || e.metaKey || e.ctrlKey) {
    s.toggleSelect(id);
    return;
  }
  const wasSelected = s.selectedIds.includes(id);
  if (!wasSelected) s.select([id]);

  const startX = e.clientX;
  const startY = e.clientY;
  let moving: { ids: string[]; origin: Record<string, { x: number; y: number }>; bounds: Rect; others: Rect[] } | null = null;

  trackPointer(
    (ev) => {
      const st = useBoard.getState();
      if (!moving) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 3) return;
        st.checkpoint();
        const ids = expandWithContents(st.nodes, st.selectedIds);
        const moved = new Set(ids);
        moving = {
          ids,
          origin: Object.fromEntries(ids.map((i) => [i, { x: st.nodes[i].x, y: st.nodes[i].y }])),
          bounds: boundsOf(ids.map((i) => rectOf(st.nodes[i])))!,
          others: Object.values(st.nodes)
            .filter((n) => !moved.has(n.id))
            .map(rectOf),
        };
        lastDragMoved = true;
        st.setDragging(true);
      }
      let dx = (ev.clientX - startX) / st.viewport.zoom;
      let dy = (ev.clientY - startY) / st.viewport.zoom;
      if (ev.altKey) {
        st.setGuides([]);
      } else {
        const snap = snapMove(moving.bounds, dx, dy, moving.others, st.viewport.zoom, useUI.getState().snapToGrid);
        ({ dx, dy } = snap);
        st.setGuides(snap.guides);
      }
      const { origin } = moving;
      st.setPositions(Object.fromEntries(moving.ids.map((i) => [i, { x: origin[i].x + dx, y: origin[i].y + dy }])));
    },
    () => {
      const st = useBoard.getState();
      st.setDragging(false);
      st.setGuides([]);
      // A plain click on one of several selected nodes narrows the selection to it.
      if (!moving && wasSelected && st.selectedIds.length > 1) st.select([id]);
    },
  );
}

/** Drag a resize handle. `both` also changes height (groups); otherwise only width. */
export function startResize(e: ReactPointerEvent, id: string, mode: 'width' | 'both') {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const s = useBoard.getState();
  const node = s.nodes[id];
  if (!node) return;
  s.checkpoint();
  const limits = SIZE_LIMITS[node.type];
  const start = { x: e.clientX, y: e.clientY, w: node.width, h: node.height };
  trackPointer((ev) => {
    const zoom = useBoard.getState().viewport.zoom;
    const width = clamp(start.w + (ev.clientX - start.x) / zoom, limits.minW, limits.maxW);
    const patch = mode === 'both' ? { width, height: Math.max(limits.minH, start.h + (ev.clientY - start.y) / zoom) } : { width };
    useBoard.getState().updateNode(id, patch);
  });
}

/**
 * Drag from a connection handle. Dropping on another node connects to it;
 * dropping on empty canvas creates a new card there, already connected.
 */
export function startConnect(e: ReactPointerEvent, id: string) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const s = useBoard.getState();
  s.setEditing(null);
  const startX = e.clientX;
  const startY = e.clientY;
  s.setPending({ fromId: id, ...screenToWorld(e.clientX, e.clientY) });
  trackPointer(
    (ev) => useBoard.getState().setPending({ fromId: id, ...screenToWorld(ev.clientX, ev.clientY) }),
    (ev) => {
      const st = useBoard.getState();
      st.setPending(null);
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = hit?.closest<HTMLElement>('[data-connectable]')?.dataset.nodeId;
      if (target) {
        st.connect(id, target);
        return;
      }
      if (!hit?.closest('.canvas')) return;
      const p = screenToWorld(ev.clientX, ev.clientY);
      const card = createCard(p.x - CARD_WIDTH / 2, p.y - 24);
      st.addNode(card, { edit: true });
      // Same undo step as creating the card.
      useBoard.setState((cur) => ({
        edges: { ...cur.edges, [`${card.id}-in`]: { id: `${card.id}-in`, from: id, to: card.id, label: '' } },
      }));
    },
  );
}

/** Bounds of the current selection, or null when nothing is selected. */
export function selectionBounds() {
  const s = useBoard.getState();
  return boundsOf(s.selectedIds.map((id) => s.nodes[id]).filter(Boolean).map(rectOf));
}
