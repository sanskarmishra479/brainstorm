import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { useMemo, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { lastDragMoved } from '../lib/interactions';
import { docHasList, renderDoc, richExtensions, toggleTask } from '../lib/richtext';
import { useBoard } from '../store/board';
import type { CardNode } from '../types';
import { FormatBar } from './FormatBar';
import { CaretIcon } from './Icons';

const stop = (e: SyntheticEvent) => e.stopPropagation();
const finishEditing = () => useBoard.getState().setEditing(null);

export function CardContent({ node, editing }: { node: CardNode; editing: boolean }) {
  return editing ? <CardEditor node={node} /> : <CardView node={node} />;
}

function CardView({ node }: { node: CardNode }) {
  const html = useMemo(() => (node.body ? renderDoc(node.body) : ''), [node.body]);

  const toggle = () => {
    if (!html) return;
    const s = useBoard.getState();
    s.checkpoint();
    s.updateNode(node.id, { collapsed: !node.collapsed });
  };

  // Checkboxes in the read-only view toggle directly; links shouldn't fire after a drag.
  const onBodyPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).matches('input[type="checkbox"]')) e.stopPropagation();
  };
  const onBodyClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.matches('input[type="checkbox"]')) {
      e.preventDefault();
      const boxes = [...e.currentTarget.querySelectorAll('ul[data-type="taskList"] > li > label > input')];
      const s = useBoard.getState();
      s.checkpoint();
      s.updateNode(node.id, { body: toggleTask(node.body!, boxes.indexOf(target)) });
    } else if (target.closest('a') && lastDragMoved) {
      e.preventDefault();
    }
  };

  return (
    <>
      <div className="card-head">
        <button
          className={['caret', node.collapsed && 'collapsed', !html && 'empty'].filter(Boolean).join(' ')}
          title={node.collapsed ? 'Expand' : 'Collapse'}
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={toggle}
        >
          <CaretIcon />
        </button>
        <div className={node.title ? 'card-title' : 'card-title placeholder'}>{node.title || 'Untitled'}</div>
      </div>
      {!node.collapsed && html && (
        <div
          className={docHasList(node.body) ? 'card-body rich align-left' : 'card-body rich'}
          dangerouslySetInnerHTML={{ __html: html }}
          onPointerDown={onBodyPointerDown}
          onClick={onBodyClick}
        />
      )}
    </>
  );
}

function CardEditor({ node }: { node: CardNode }) {
  // Fixed when editing starts: TipTap re-applies changed options, which would steal focus
  // from the title as soon as its first letter is typed.
  const [initial] = useState(() => ({ body: node.body ?? '', focusBody: !!node.title }));
  const editor = useEditor({
    extensions: [...richExtensions, Placeholder.configure({ placeholder: 'Write something…' })],
    content: initial.body,
    // Existing cards open with the caret at the end of the body; new ones start in the title.
    autofocus: initial.focusBody ? 'end' : false,
    editorProps: {
      handleKeyDown: (_view, e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          finishEditing();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => useBoard.getState().updateNode(node.id, { body: editor.isEmpty ? null : editor.getJSON() }),
  });

  return (
    <>
      {editor && <FormatBar editor={editor} />}
      <div className="card-edit">
        <input
          autoFocus={!initial.focusBody}
          value={node.title}
          placeholder="Title"
          onChange={(e) => useBoard.getState().updateNode(node.id, { title: e.target.value })}
          onKeyDown={(e) => onTitleKey(e, editor)}
        />
        <EditorContent editor={editor} className="card-body rich align-left" />
      </div>
    </>
  );
}

function onTitleKey(e: React.KeyboardEvent<HTMLInputElement>, editor: Editor | null) {
  if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault();
    finishEditing();
  } else if (e.key === 'Enter' || (e.key === 'ArrowDown' && editor)) {
    e.preventDefault();
    editor?.commands.focus('start');
  }
}
