import { memo, type PointerEvent as ReactPointerEvent } from 'react';
import { startNodeDrag, startResize } from '../lib/interactions';
import { isDoubleTap } from '../lib/pointer';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';

/**
 * A titled area that holds other nodes. Membership is spatial: whatever sits
 * inside the frame moves with it. The body behaves like empty canvas, so you
 * can box-select or double-click to add cards inside it.
 */
export const GroupView = memo(function GroupView({ id }: { id: string }) {
  const node = useBoard((s) => s.nodes[id]);
  const selected = useBoard((s) => s.selectedIds.includes(id));
  const editing = useBoard((s) => s.editingId === id);
  const dimmed = useUI((s) => s.searchMatches !== null && !s.searchMatches.has(id));

  if (!node || node.type !== 'group') return null;

  const onHeaderDown = (e: ReactPointerEvent) => {
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

  const finish = () => useBoard.getState().setEditing(null);

  return (
    <div
      data-node-id={id}
      className={`group color-${node.color}${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
    >
      <div
        className="group-header"
        onPointerDown={onHeaderDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          useBoard.getState().select([id]);
          useBoard.getState().setEditing(id);
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={node.title}
            placeholder="Group name"
            onChange={(e) => useBoard.getState().updateNode(id, { title: e.target.value })}
            onBlur={finish}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && finish()}
          />
        ) : (
          <span className={node.title ? undefined : 'placeholder'}>{node.title || 'Untitled group'}</span>
        )}
      </div>
      <div className="group-body" data-canvas-bg="" />
      <div className="resize-corner" onPointerDown={(e) => startResize(e, id, 'both')} />
    </div>
  );
});
