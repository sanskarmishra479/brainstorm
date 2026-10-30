import { useBoard } from '../store/board';
import type { ImageNode } from '../types';

/** An image with an optional caption underneath. Double-click edits the caption. */
export function ImageContent({ node, editing }: { node: ImageNode; editing: boolean }) {
  const finish = () => useBoard.getState().setEditing(null);
  return (
    <>
      <div className="image-frame" style={{ aspectRatio: `1 / ${node.aspect}` }}>
        <img src={node.src} alt={node.caption} draggable={false} />
      </div>
      {editing ? (
        <input
          className="image-caption"
          autoFocus
          value={node.caption}
          placeholder="Add a caption"
          onChange={(e) => useBoard.getState().updateNode(node.id, { caption: e.target.value })}
          onBlur={finish}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && finish()}
        />
      ) : (
        node.caption && <div className="image-caption">{node.caption}</div>
      )}
    </>
  );
}
