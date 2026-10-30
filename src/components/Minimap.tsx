import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { stopAnimation } from '../lib/camera';
import { boundsOf } from '../lib/geometry';
import { isGroup, rectOf } from '../lib/nodes';
import { trackPointer } from '../lib/pointer';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { CloseIcon, MapIcon } from './Icons';

const W = 200;
const H = 130;
const PAD = 8;
const TOPBAR = 48;

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/** Overview of the whole board with the visible area outlined. Click or drag to move around. */
export function Minimap() {
  const open = useUI((s) => s.minimapOpen);
  const nodes = useBoard((s) => s.nodes);
  const viewport = useBoard((s) => s.viewport);
  const size = useWindowSize();

  if (!open) {
    return (
      <button className="minimap-toggle" title="Show minimap" onClick={() => useUI.getState().setPref('minimapOpen', true)}>
        <MapIcon />
      </button>
    );
  }

  const list = Object.values(nodes);
  const view = {
    x: -viewport.x / viewport.zoom,
    y: (TOPBAR - viewport.y) / viewport.zoom,
    width: size.w / viewport.zoom,
    height: (size.h - TOPBAR) / viewport.zoom,
  };
  const area = boundsOf([view, ...list.map(rectOf)])!;
  const scale = Math.min((W - PAD * 2) / area.width, (H - PAD * 2) / area.height);
  const ox = (W - area.width * scale) / 2 - area.x * scale;
  const oy = (H - area.height * scale) / 2 - area.y * scale;

  const moveTo = (clientX: number, clientY: number, svg: Element) => {
    const r = svg.getBoundingClientRect();
    const wx = (clientX - r.left - ox) / scale;
    const wy = (clientY - r.top - oy) / scale;
    const s = useBoard.getState();
    const z = s.viewport.zoom;
    s.setViewport({ zoom: z, x: size.w / 2 - wx * z, y: (size.h + TOPBAR) / 2 - wy * z });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    stopAnimation();
    const svg = e.currentTarget;
    moveTo(e.clientX, e.clientY, svg);
    trackPointer((ev) => moveTo(ev.clientX, ev.clientY, svg));
  };

  return (
    <div className="minimap">
      <svg width={W} height={H} onPointerDown={onPointerDown}>
        <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
          {list.filter(isGroup).map((n) => (
            <rect key={n.id} className={`mm-group color-${n.color}`} x={n.x} y={n.y} width={n.width} height={n.height} rx={12} />
          ))}
          {list
            .filter((n) => !isGroup(n))
            .map((n) => (
              <rect key={n.id} className={`mm-node mm-${n.type} color-${n.color}`} x={n.x} y={n.y} width={n.width} height={Math.max(n.height, 20)} rx={8} />
            ))}
          <rect className="mm-view" x={view.x} y={view.y} width={view.width} height={view.height} rx={4 / scale} />
        </g>
      </svg>
      <button className="minimap-close" title="Hide minimap" onClick={() => useUI.getState().setPref('minimapOpen', false)}>
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
