import { useBoard } from '../store/board';
import type { TextNode } from '../types';
import { AutoTextarea } from './AutoTextarea';

/** A free-floating text note, for headings and labels on the canvas. */
export function TextContent({ node, editing }: { node: TextNode; editing: boolean }) {
  if (editing) {
    return (
      <AutoTextarea
        autoFocus
        className="text-input"
        value={node.text}
        placeholder="Type something…"
        onChange={(text) => useBoard.getState().updateNode(node.id, { text })}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            useBoard.getState().setEditing(null);
          }
        }}
      />
    );
  }
  return <div className="text-display">{node.text}</div>;
}
