import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { addCardAt } from '../lib/actions';
import { pointer, screenToWorld, stopAnimation, zoomAround } from '../lib/camera';
import { clamp, containsRect, intersects, rectFromPoints, type Rect } from '../lib/geometry';
import { isGroup, rectOf } from '../lib/nodes';
import { addImageFiles, addLinkAt, normalizeUrl } from '../lib/media';
import { cancelActiveDrag, isDoubleTap, isTypingTarget, trackPointer } from '../lib/pointer';
import { useBoard } from '../store/board';
import { Edges } from './Edges';
import { Guides } from './Guides';
import { GroupView } from './GroupView';
import { NodeView } from './NodeView';
import { SelectionToolbar } from './SelectionToolbar';

const GRID = 24;

/** True when the press landed on empty canvas (including the inside of a group). */
const isBackground = (e: { target: EventTarget; currentTarget: EventTarget }) =>
  e.target === e.currentTarget || (e.target instanceof HTMLElement && e.target.hasAttribute('data-canvas-bg'));

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useBoard((s) => s.viewport);
  const tool = useBoard((s) => s.tool);
  const connecting = useBoard((s) => s.pending !== null);
  const dragging = useBoard((s) => s.dragging);
  const isEmpty = useBoard((s) => Object.keys(s.nodes).length === 0);
  // Larger groups first so nested, smaller groups stay clickable on top of them.
  const groupIds = useBoard(
    useShallow((s) =>
      Object.values(s.nodes)
        .filter(isGroup)
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((n) => n.id),
    ),
  );
  const nodeIds = useBoard(
    useShallow((s) =>
      Object.values(s.nodes)
        .filter((n) => !isGroup(n))
        .map((n) => n.id),
    ),
  );
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const handMode = tool === 'hand' || spaceDown;
  // Active touch points, for two-finger pinch-zoom and pan.
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  // Wheel: pan by default, zoom toward the cursor with Ctrl/Cmd (also trackpad pinch).
  useEffect(() => {
    const el = ref.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopAnimation();
      const s = useBoard.getState();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        s.setViewport(zoomAround(s.viewport, e.clientX, e.clientY, Math.exp(-clamp(dy, -60, 60) * 0.008)));
      } else {
        s.setViewport({ ...s.viewport, x: s.viewport.x - dx, y: s.viewport.y - dy });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Two-finger gestures: track every touch, and once two are down, pan and zoom together.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!touches.current.has(e.pointerId)) return;
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = pinch.current;
      if (!p || touches.current.size < 2) return;
      const [a, b] = [...touches.current.values()];
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const s = useBoard.getState();
      const panned = { ...s.viewport, x: s.viewport.x + cx - p.cx, y: s.viewport.y + cy - p.cy };
      s.setViewport(zoomAround(panned, cx, cy, dist / p.dist));
      pinch.current = { dist, cx, cy };
    };
    const up = (e: PointerEvent) => {
      touches.current.delete(e.pointerId);
      if (touches.current.size < 2) pinch.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  /** A second finger turns whatever the first one started into a pinch. */
  const startPinch = () => {
    cancelActiveDrag();
    const s = useBoard.getState();
    s.setDragging(false);
    s.setPending(null);
    s.setGuides([]);
    setMarquee(null);
    setPanning(false);
    stopAnimation();
    const [a, b] = [...touches.current.values()];
    pinch.current = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };

  // Hold Space to temporarily pan.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const startPan = (e: ReactPointerEvent) => {
    e.preventDefault();
    stopAnimation();
    const start = { x: e.clientX, y: e.clientY, v: useBoard.getState().viewport };
    setPanning(true);
    trackPointer(
      (ev) =>
        useBoard.getState().setViewport({
          ...start.v,
          x: start.v.x + ev.clientX - start.x,
          y: start.v.y + ev.clientY - start.y,
        }),
      () => setPanning(false),
    );
  };

  /** Drag a selection box. Groups are only picked up when fully enclosed, so boxes can start inside them. */
  const startMarquee = (e: ReactPointerEvent) => {
    e.preventDefault();
    const s = useBoard.getState();
    const base = e.shiftKey ? s.selectedIds : [];
    if (!e.shiftKey) s.clearSelection();
    const origin = screenToWorld(e.clientX, e.clientY);
    let active = false;
    trackPointer(
      (ev) => {
        if (!active && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
        active = true;
        const rect = rectFromPoints(origin, screenToWorld(ev.clientX, ev.clientY));
        setMarquee(rect);
        const st = useBoard.getState();
        const hits = Object.values(st.nodes)
          .filter((n) => (isGroup(n) ? containsRect(rect, rectOf(n)) : intersects(rect, rectOf(n))))
          .map((n) => n.id);
        st.select([...new Set([...base, ...hits])]);
      },
      () => setMarquee(null),
    );
  };

  // Capture phase so the hand tool, middle mouse and pinches take over even when starting on a node.
  const onPointerDownCapture = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        e.stopPropagation();
        startPinch();
        return;
      }
    }
    if (e.button === 1 || (e.button === 0 && handMode)) {
      e.stopPropagation();
      startPan(e);
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !isBackground(e)) return;
    const s = useBoard.getState();
    s.setEditing(null);
    s.setEditingEdge(null);
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (e.pointerType === 'touch') {
      if (isDoubleTap(e, 'canvas') && !handMode) {
        const p = screenToWorld(e.clientX, e.clientY);
        addCardAt(p.x, p.y);
        return;
      }
      s.clearSelection();
      startPan(e);
    } else {
      startMarquee(e);
    }
  };

  const onDoubleClick = (e: ReactMouseEvent) => {
    if (!isBackground(e) || handMode) return;
    const p = screenToWorld(e.clientX, e.clientY);
    addCardAt(p.x, p.y);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/uri-list')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const at = screenToWorld(e.clientX, e.clientY);
    const files = [...e.dataTransfer.files];
    if (files.length) return void addImageFiles(files, at);
    const url = normalizeUrl(e.dataTransfer.getData('text/uri-list').split('\n')[0] ?? '');
    if (url) addLinkAt(url, at);
  };

  // Double the grid spacing when zoomed far out so the dots don't turn into noise.
  let step = GRID * viewport.zoom;
  while (step < 12) step *= 2;

  const className = [
    'canvas',
    handMode ? 'tool-hand' : 'tool-select',
    panning && 'panning',
    connecting && 'connecting',
    dragging && 'dragging',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={className}
      style={{
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => Object.assign(pointer, { x: e.clientX, y: e.clientY, inside: true })}
      onPointerLeave={() => (pointer.inside = false)}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className="world"
        style={
          {
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            '--zoom': viewport.zoom,
          } as CSSProperties
        }
      >
        {groupIds.map((id) => (
          <GroupView key={id} id={id} />
        ))}
        <Edges />
        {nodeIds.map((id) => (
          <NodeView key={id} id={id} />
        ))}
        <Guides />
        <SelectionToolbar />
        {marquee && (
          <div
            className="marquee"
            style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
          />
        )}
      </div>

      {isEmpty && (
        <div className="empty-state">
          <div className="empty-title">This board is empty</div>
          <div>Double-click anywhere to add your first card</div>
        </div>
      )}
    </div>
  );
}
