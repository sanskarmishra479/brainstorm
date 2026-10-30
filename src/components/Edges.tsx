import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { edgeGeometry, pendingPath } from '../lib/geometry';
import { useBoard } from '../store/board';
import type { Edge } from '../types';

const selectEdge = (e: ReactPointerEvent, id: string) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  const s = useBoard.getState();
  s.setEditing(null);
  s.selectEdge(id);
};

const editEdge = (e: ReactMouseEvent, id: string) => {
  e.stopPropagation();
  useBoard.getState().setEditingEdge(id);
};

export function Edges() {
  const edges = useBoard((s) => s.edges);
  const nodes = useBoard((s) => s.nodes);
  const selectedEdgeId = useBoard((s) => s.selectedEdgeId);
  const editingEdgeId = useBoard((s) => s.editingEdgeId);
  const pending = useBoard((s) => s.pending);

  const items = Object.values(edges).flatMap((edge) => {
    const a = nodes[edge.from];
    const b = nodes[edge.to];
    return a && b ? [{ edge, ...edgeGeometry(a, b) }] : [];
  });
  const pendingFrom = pending && nodes[pending.fromId];

  return (
    <>
      <svg className="edges">
        <defs>
          {['arrow', 'arrow-selected'].map((id) => (
            <marker
              key={id}
              id={id}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L9,5 L0,9 z" className={id === 'arrow' ? 'arrow-head' : 'arrow-head selected'} />
            </marker>
          ))}
        </defs>
        {items.map(({ edge, d }) => {
          const selected = edge.id === selectedEdgeId;
          return (
            <g key={edge.id} className={selected ? 'edge selected' : 'edge'}>
              <path
                className="edge-hit"
                d={d}
                onPointerDown={(e) => selectEdge(e, edge.id)}
                onDoubleClick={(e) => editEdge(e, edge.id)}
              />
              <path className="edge-line" d={d} markerEnd={`url(#${selected ? 'arrow-selected' : 'arrow'})`} />
            </g>
          );
        })}
        {pending && pendingFrom && (
          <path className="edge-line pending" d={pendingPath(pendingFrom, pending)} markerEnd="url(#arrow-selected)" />
        )}
      </svg>
      {items.map(
        ({ edge, mid }) =>
          (edge.label || edge.id === editingEdgeId) && (
            <EdgeLabel
              key={edge.id}
              edge={edge}
              x={mid.x}
              y={mid.y}
              selected={edge.id === selectedEdgeId}
              editing={edge.id === editingEdgeId}
            />
          ),
      )}
    </>
  );
}

function EdgeLabel({ edge, x, y, selected, editing }: { edge: Edge; x: number; y: number; selected: boolean; editing: boolean }) {
  return (
    <div
      className={selected ? 'edge-label selected' : 'edge-label'}
      style={{ left: x, top: y }}
      onPointerDown={(e) => selectEdge(e, edge.id)}
      onDoubleClick={(e) => editEdge(e, edge.id)}
    >
      {editing ? (
        <input
          autoFocus
          value={edge.label}
          placeholder="Label"
          size={Math.max(edge.label.length, 6)}
          onChange={(e) => useBoard.getState().updateEdge(edge.id, { label: e.target.value })}
          onBlur={() => useBoard.getState().setEditingEdge(null)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && e.currentTarget.blur()}
        />
      ) : (
        edge.label
      )}
    </div>
  );
}
