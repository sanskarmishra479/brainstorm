import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { addCardAtCenter, addGroup, addTextAtCenter } from './actions';
import { fitToContent, resetZoom, zoomBy } from './camera';
import { duplicateSelection } from './clipboard';
import { tidyUp } from './layout';
import { expandWithContents } from './nodes';
import { isTypingTarget } from './pointer';

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function onKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;
  const s = useBoard.getState();
  const key = e.key.toLowerCase();

  if (e.ctrlKey || e.metaKey) {
    const actions: Record<string, () => void> = {
      z: e.shiftKey ? s.redo : s.undo,
      y: s.redo,
      '=': () => zoomBy(1.25),
      '+': () => zoomBy(1.25),
      '-': () => zoomBy(0.8),
      '0': resetZoom,
      a: s.selectAll,
      d: duplicateSelection,
      g: e.shiftKey ? () => s.selectedIds.forEach((id) => s.ungroup(id)) : addGroup,
      f: () => useUI.getState().setSearchOpen(true),
    };
    const action = actions[key];
    if (action) {
      e.preventDefault();
      action();
    }
    return;
  }

  if (e.shiftKey && e.code === 'Digit1') return fitToContent();
  if (e.shiftKey && key === 't') return tidyUp();
  if (e.key === '?') return useUI.getState().setShortcutsOpen(true);

  const arrow = ARROWS[e.key];
  if (arrow && s.selectedIds.length > 0) {
    e.preventDefault();
    if (!e.repeat) s.checkpoint();
    const step = e.shiftKey ? 10 : 1;
    const ids = expandWithContents(s.nodes, s.selectedIds);
    s.setPositions(
      Object.fromEntries(ids.map((id) => [id, { x: s.nodes[id].x + arrow[0] * step, y: s.nodes[id].y + arrow[1] * step }])),
    );
    return;
  }

  switch (key) {
    case 'delete':
    case 'backspace':
      e.preventDefault();
      s.deleteSelection();
      break;
    case 'escape':
      s.clearSelection();
      s.setEditing(null);
      break;
    case 'enter':
      if (s.selectedIds.length === 1) {
        e.preventDefault();
        s.setEditing(s.selectedIds[0]);
      } else if (s.selectedEdgeId) {
        e.preventDefault();
        s.setEditingEdge(s.selectedEdgeId);
      }
      break;
    case 'tab':
      if (s.selectedIds.length === 1) {
        e.preventDefault();
        s.addChild(s.selectedIds[0]);
      }
      break;
    case 'v':
      s.setTool('select');
      break;
    case 'h':
      s.setTool('hand');
      break;
    // preventDefault so the key isn't typed into the field that the new node focuses.
    case 'n':
      e.preventDefault();
      addCardAtCenter();
      break;
    case 't':
      e.preventDefault();
      addTextAtCenter();
      break;
  }
}

export function installShortcuts() {
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
