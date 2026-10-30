import { useEditorState, type Editor } from '@tiptap/react';
import type { ReactNode, SyntheticEvent } from 'react';
import { BoldIcon, BulletListIcon, CheckListIcon, HeadingIcon, ItalicIcon, NumberListIcon, StrikeIcon } from './Icons';

const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Formatting controls shown above a card while its body is being edited. */
export function FormatBar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      strike: ed.isActive('strike'),
      heading: ed.isActive('heading'),
      bullet: ed.isActive('bulletList'),
      ordered: ed.isActive('orderedList'),
      task: ed.isActive('taskList'),
    }),
  });

  const chain = () => editor.chain().focus();
  const buttons: { key: keyof typeof active; title: string; icon: ReactNode; run: () => void }[] = [
    { key: 'bold', title: 'Bold (Ctrl B)', icon: <BoldIcon />, run: () => chain().toggleBold().run() },
    { key: 'italic', title: 'Italic (Ctrl I)', icon: <ItalicIcon />, run: () => chain().toggleItalic().run() },
    { key: 'strike', title: 'Strikethrough', icon: <StrikeIcon />, run: () => chain().toggleStrike().run() },
    { key: 'heading', title: 'Heading', icon: <HeadingIcon />, run: () => chain().toggleHeading({ level: 3 }).run() },
    { key: 'bullet', title: 'Bullet list', icon: <BulletListIcon />, run: () => chain().toggleBulletList().run() },
    { key: 'ordered', title: 'Numbered list', icon: <NumberListIcon />, run: () => chain().toggleOrderedList().run() },
    { key: 'task', title: 'Checklist', icon: <CheckListIcon />, run: () => chain().toggleTaskList().run() },
  ];

  return (
    // mousedown is prevented so clicking a button doesn't take focus away from the text.
    <div className="floating-toolbar" onPointerDown={stop} onMouseDown={(e) => e.preventDefault()} onDoubleClick={stop}>
      {buttons.map((b, i) => (
        <span key={b.key} style={{ display: 'contents' }}>
          {(i === 3 || i === 4) && <span className="toolbar-sep" />}
          <button className={active[b.key] ? 'toolbar-btn active' : 'toolbar-btn'} title={b.title} onClick={b.run}>
            {b.icon}
          </button>
        </span>
      ))}
    </div>
  );
}
