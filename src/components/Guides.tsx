import { useBoard } from '../store/board';

/** Alignment lines shown while dragging, in world coordinates. */
export function Guides() {
  const guides = useBoard((s) => s.guides);
  if (guides.length === 0) return null;
  return (
    <svg className="guides">
      {guides.map((g, i) =>
        g.axis === 'x' ? (
          <line key={i} x1={g.pos} x2={g.pos} y1={g.start} y2={g.end} />
        ) : (
          <line key={i} x1={g.start} x2={g.end} y1={g.pos} y2={g.pos} />
        ),
      )}
    </svg>
  );
}
