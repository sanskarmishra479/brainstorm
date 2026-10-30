import { memo, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { startConnect, startNodeDrag, startResize } from '../lib/interactions';
import { isDoubleTap } from '../lib/pointer';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { CardContent } from './CardContent';
import { ImageContent } from './ImageContent';
import { LinkContent } from './LinkContent';
import { TextContent } from './TextContent';
import { useMeasuredHeight } from './useMeasuredHeight';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** Shared shell for content nodes: selection, dragging, connection handles and width resizing. */
export const NodeView = memo(function NodeView({ id }: { id: string }) {
  const node = useBoard((s) => s.nodes[id]);
  const selected = useBoard((s) => s.selectedIds.includes(id));
  const editing = useBoard((s) => s.editingId === id);
  const dimmed = useUI((s) => s.searchMatches !== null && !s.searchMatches.has(id));
  const ref = useRef<HTMLDivElement>(null);
  useMeasuredHeight(ref, id);

  if (!node || node.type === 'group') return null;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (editing) return;
    const s = useBoard.getState();
    if (isDoubleTap(e, id)) {
      s.select([id]);
      s.setEditing(id);
      return;
    }
    if (s.editingId) s.setEditing(null);
    startNodeDrag(e, id);
  };

  const onDoubleClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    const s = useBoard.getState();
    s.select([id]);
    s.setEditing(id);
  };

  const className = [
    'node',
    `node-${node.type}`,
    `color-${node.color}`,
    node.type === 'text' && `size-${node.size}`,
    selected && 'selected',
    editing && 'editing',
    dimmed && 'dimmed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      data-node-id={id}
      data-connectable=""
      className={className}
      style={{ left: node.x, top: node.y, width: node.width }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {node.type === 'card' && <CardContent node={node} editing={editing} />}
      {node.type === 'text' && <TextContent node={node} editing={editing} />}
      {node.type === 'image' && <ImageContent node={node} editing={editing} />}
      {node.type === 'link' && <LinkContent node={node} editing={editing} />}

      {!editing &&
        SIDES.map((side) => <div key={side} className={`handle handle-${side}`} onPointerDown={(e) => startConnect(e, id)} />)}
      <div className="resize-x" onPointerDown={(e) => startResize(e, id, 'width')} />
    </div>
  );
});
