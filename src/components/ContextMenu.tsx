import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { addCardAt, addGroup, addTextAt } from '../lib/actions';
import { fitToContent } from '../lib/camera';
import { copySelection, duplicateSelection, pasteFromClipboard } from '../lib/clipboard';
import { tidyUp } from '../lib/layout';
import { isGroup } from '../lib/nodes';
import { useBoard } from '../store/board';
import { useUI, type ContextMenuState } from '../store/ui';
import { NODE_COLORS, TEXT_SIZES, type BoardNode, type NodePatch } from '../types';
import {
  AddCardIcon,
  BringFrontIcon,
  CollapseIcon,
  ConnectIcon,
  CopyIcon,
  CutIcon,
  DownloadIcon,
  DuplicateIcon,
  ExternalIcon,
  FitIcon,
  GroupIcon,
  LinkIcon,
  PasteIcon,
  PencilIcon,
  RefreshIcon,
  SelectAllIcon,
  SendBackIcon,
  TextIcon,
  TidyIcon,
  TrashIcon,
  UngroupIcon,
} from './Icons';

type Entry =
  | { label: string; icon: ReactNode; hint?: string; danger?: boolean; run: () => void }
  | { row: ReactNode }
  | 'sep';

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const EDIT_LABEL: Record<BoardNode['type'], string> = {
  card: 'Edit',
  text: 'Edit text',
  image: 'Edit caption',
  link: 'Edit link',
  group: 'Rename group',
};

function downloadImage(src: string, name: string) {
  const ext = src.match(/^data:image\/(\w+)/)?.[1] ?? 'png';
  const a = document.createElement('a');
  a.href = src;
  a.download = `${name.trim() || 'image'}.${ext}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}

/** Menu entries for the current selection of nodes. */
function nodeEntries(): Entry[] {
  const s = useBoard.getState();
  const nodes = s.selectedIds.map((id) => s.nodes[id]).filter(Boolean);
  if (nodes.length === 0) return [];
  const single = nodes.length === 1 ? nodes[0] : null;
  const ids = nodes.map((n) => n.id);
  const apply = (patch: NodePatch) => {
    s.checkpoint();
    s.updateNodes(ids, patch);
  };
  const entries: Entry[] = [];

  if (single) {
    entries.push({ label: EDIT_LABEL[single.type], icon: <PencilIcon />, hint: 'Enter', run: () => s.setEditing(single.id) });
    if (!isGroup(single)) entries.push({ label: 'Add connected card', icon: <ConnectIcon />, hint: 'Tab', run: () => s.addChild(single.id) });
    if (single.type === 'card' && single.body) {
      entries.push({
        label: single.collapsed ? 'Expand' : 'Collapse',
        icon: <CollapseIcon />,
        run: () => apply({ collapsed: !single.collapsed }),
      });
    }
    if (single.type === 'link' && single.url) {
      entries.push(
        'sep',
        { label: 'Open link', icon: <ExternalIcon />, run: () => window.open(single.url, '_blank', 'noopener,noreferrer') },
        { label: 'Copy link address', icon: <LinkIcon size={16} />, run: () => void navigator.clipboard.writeText(single.url) },
        { label: 'Refresh preview', icon: <RefreshIcon />, run: () => s.updateNode(single.id, { status: 'idle' }) },
      );
    }
    if (single.type === 'image') {
      entries.push({ label: 'Download image', icon: <DownloadIcon />, run: () => downloadImage(single.src, single.caption) });
    }
  }

  if (nodes.some((n) => n.type !== 'image')) {
    const current = nodes.every((n) => n.color === nodes[0].color) ? nodes[0].color : null;
    entries.push('sep', {
      row: NODE_COLORS.map((color) => (
        <button
          key={color}
          className={`swatch color-${color}${current === color ? ' active' : ''}`}
          title={color}
          onClick={() => apply({ color })}
        />
      )),
    });
  }
  if (single?.type === 'text') {
    entries.push({
      row: TEXT_SIZES.map((size) => (
        <button key={size} className={`toolbar-btn text-size${single.size === size ? ' active' : ''}`} onClick={() => apply({ size })}>
          {size.toUpperCase()}
        </button>
      )),
    });
  }

  entries.push(
    'sep',
    { label: 'Copy', icon: <CopyIcon />, hint: `${MOD} C`, run: () => copySelection() },
    { label: 'Cut', icon: <CutIcon />, hint: `${MOD} X`, run: () => copySelection(true) },
    { label: 'Duplicate', icon: <DuplicateIcon />, hint: `${MOD} D`, run: duplicateSelection },
  );

  const arrange: Entry[] = [];
  if (nodes.length > 1) {
    arrange.push(
      { label: 'Group', icon: <GroupIcon />, hint: `${MOD} G`, run: () => s.groupSelection() },
      { label: 'Tidy up', icon: <TidyIcon />, hint: 'Shift T', run: tidyUp },
    );
  }
  if (single && isGroup(single)) arrange.push({ label: 'Ungroup', icon: <UngroupIcon />, hint: `${MOD} Shift G`, run: () => s.ungroup(single.id) });
  if (nodes.some((n) => !isGroup(n))) {
    arrange.push(
      { label: 'Bring to front', icon: <BringFrontIcon />, run: () => s.reorder(ids, 'front') },
      { label: 'Send to back', icon: <SendBackIcon />, run: () => s.reorder(ids, 'back') },
    );
  }
  if (arrange.length) entries.push('sep', ...arrange);

  const what = single ? (isGroup(single) ? 'group and contents' : '') : `${nodes.length} items`;
  entries.push('sep', { label: what ? `Delete ${what}` : 'Delete', icon: <TrashIcon />, hint: 'Del', danger: true, run: () => s.deleteSelection() });
  return entries;
}

function edgeEntries(): Entry[] {
  const s = useBoard.getState();
  const id = s.selectedEdgeId;
  if (!id) return [];
  return [
    { label: s.edges[id]?.label ? 'Edit label' : 'Add label', icon: <PencilIcon />, hint: 'Enter', run: () => s.setEditingEdge(id) },
    'sep',
    { label: 'Delete connection', icon: <TrashIcon />, hint: 'Del', danger: true, run: () => s.deleteSelection() },
  ];
}

function canvasEntries(menu: ContextMenuState): Entry[] {
  const { x, y } = menu.world;
  const s = useBoard.getState();
  const hasNodes = Object.keys(s.nodes).length > 0;
  const entries: Entry[] = [
    { label: 'Add card here', icon: <AddCardIcon />, hint: 'Double-click', run: () => addCardAt(x, y) },
    { label: 'Add text here', icon: <TextIcon />, run: () => addTextAt(x, y) },
    { label: 'Paste here', icon: <PasteIcon />, hint: `${MOD} V`, run: () => void pasteFromClipboard(menu.world) },
  ];
  if (s.selectedIds.length > 0) entries.push({ label: 'Group selection', icon: <GroupIcon />, hint: `${MOD} G`, run: addGroup });
  if (hasNodes) {
    entries.push(
      'sep',
      { label: 'Select all', icon: <SelectAllIcon />, hint: `${MOD} A`, run: s.selectAll },
      { label: 'Tidy up board', icon: <TidyIcon />, hint: 'Shift T', run: tidyUp },
      { label: 'Fit to screen', icon: <FitIcon />, hint: 'Shift 1', run: fitToContent },
    );
  }
  return entries;
}

export function ContextMenu() {
  const menu = useUI((s) => s.contextMenu);
  // Remount per opening so position and focus start fresh.
  return menu ? <MenuPanel key={`${menu.x},${menu.y},${menu.target}`} menu={menu} /> : null;
}

function MenuPanel({ menu }: { menu: ContextMenuState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  const [entries] = useState(() => (menu.target === 'node' ? nodeEntries() : menu.target === 'edge' ? edgeEntries() : canvasEntries(menu)));
  const close = () => useUI.getState().closeContextMenu();

  // Keep the menu on screen, flipping it up or left near the edges.
  useLayoutEffect(() => {
    const el = ref.current!;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: menu.x + width + pad > window.innerWidth ? Math.max(pad, menu.x - width) : menu.x,
      top: menu.y + height + pad > window.innerHeight ? Math.max(pad, window.innerHeight - height - pad) : menu.y,
    });
    el.focus();
  }, [menu]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, []);

  // Arrow keys move between items, like a native menu.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...ref.current!.querySelectorAll<HTMLButtonElement>('.context-item')];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length : i) - 1;
    items[next]?.focus();
  };

  if (entries.length === 0) {
    queueMicrotask(close);
    return null;
  }

  return (
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      tabIndex={-1}
      style={pos}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {entries.map((entry, i) => {
        if (entry === 'sep') return i > 0 && entries[i - 1] !== 'sep' ? <div key={i} className="context-sep" /> : null;
        if ('row' in entry) {
          return (
            <div key={i} className="context-row" onClick={close}>
              {entry.row}
            </div>
          );
        }
        return (
          <button
            key={i}
            role="menuitem"
            className={entry.danger ? 'context-item danger' : 'context-item'}
            onClick={() => {
              close();
              entry.run();
            }}
          >
            {entry.icon}
            <span>{entry.label}</span>
            {entry.hint && <kbd>{entry.hint}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
