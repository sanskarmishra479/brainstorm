import type { SyntheticEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { boundsOf } from '../lib/geometry';
import { tidyUp } from '../lib/layout';
import { rectOf } from '../lib/nodes';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { NODE_COLORS, TEXT_SIZES, type NodePatch } from '../types';
import { GroupIcon, RefreshIcon, TidyIcon, TrashIcon, UngroupIcon } from './Icons';

const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Floating actions above the selection. Counter-scaled so it stays the same size at any zoom. */
export function SelectionToolbar() {
  const nodes = useBoard(useShallow((s) => s.selectedIds.map((id) => s.nodes[id]).filter(Boolean)));
  const busy = useBoard((s) => s.dragging || s.editingId !== null || s.pending !== null);
  const menuOpen = useUI((s) => s.contextMenu !== null);
  const hidden = busy || menuOpen;
  if (nodes.length === 0 || hidden) return null;

  const s = useBoard.getState();
  const b = boundsOf(nodes.map(rectOf))!;
  const single = nodes.length === 1 ? nodes[0] : null;
  const ids = nodes.map((n) => n.id);
  const apply = (patch: NodePatch) => {
    s.checkpoint();
    s.updateNodes(ids, patch);
  };
  const currentColor = nodes.every((n) => n.color === nodes[0].color) ? nodes[0].color : null;
  const colorable = nodes.some((n) => n.type !== 'image');

  return (
    <div
      className="floating-toolbar"
      style={{ left: b.x + b.width / 2, top: b.y }}
      onPointerDown={stop}
      onDoubleClick={stop}
    >
      {colorable &&
        NODE_COLORS.map((color) => (
          <button
            key={color}
            className={`swatch color-${color}${currentColor === color ? ' active' : ''}`}
            title={color}
            onClick={() => apply({ color })}
          />
        ))}

      {single?.type === 'text' && (
        <>
          <span className="toolbar-sep" />
          {TEXT_SIZES.map((size) => (
            <button
              key={size}
              className={`toolbar-btn text-size${single.size === size ? ' active' : ''}`}
              title={`Text size ${size.toUpperCase()}`}
              onClick={() => apply({ size })}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </>
      )}

      {colorable && <span className="toolbar-sep" />}
      {nodes.length > 1 && (
        <>
          <button className="toolbar-btn" title="Tidy up (Shift T)" onClick={tidyUp}>
            <TidyIcon />
          </button>
          <button className="toolbar-btn" title="Group (Ctrl G)" onClick={() => s.groupSelection()}>
            <GroupIcon />
          </button>
        </>
      )}
      {single?.type === 'link' && single.url && (
        <button className="toolbar-btn" title="Refresh preview" onClick={() => s.updateNode(single.id, { status: 'idle' })}>
          <RefreshIcon />
        </button>
      )}
      {single?.type === 'group' && (
        <button className="toolbar-btn" title="Ungroup — keep contents (Ctrl Shift G)" onClick={() => s.ungroup(single.id)}>
          <UngroupIcon />
        </button>
      )}
      <button className="toolbar-btn danger" title="Delete (Del)" onClick={() => s.deleteSelection()}>
        <TrashIcon />
      </button>
    </div>
  );
}
