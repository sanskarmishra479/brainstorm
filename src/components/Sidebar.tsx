import { useState } from 'react';
import { createBoard, deleteBoard, renameBoard, switchBoard } from '../lib/persistence';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { PencilIcon, PlusIcon, TrashIcon } from './Icons';

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function timeAgo(ts: number) {
  const minutes = Math.round((ts - Date.now()) / 60000);
  if (minutes > -1) return 'just now';
  if (minutes > -60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

export function Sidebar() {
  const open = useUI((s) => s.sidebarOpen);
  const setOpen = useUI((s) => s.setSidebarOpen);
  const boards = useBoard((s) => s.boards);
  const boardId = useBoard((s) => s.boardId);
  const [renaming, setRenaming] = useState<string | null>(null);

  const sorted = [...boards].sort((a, b) => b.updatedAt - a.updatedAt);
  const closeOnSmallScreens = () => window.innerWidth < 700 && setOpen(false);

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'} aria-hidden={!open}>
      <div className="sidebar-head">
        <span>Boards</span>
        <button
          className="sidebar-new"
          onClick={async () => {
            await createBoard();
            closeOnSmallScreens();
          }}
        >
          <PlusIcon /> New board
        </button>
      </div>
      <ul className="board-list">
        {sorted.map((b) => (
          <li
            key={b.id}
            className={b.id === boardId ? 'board-item active' : 'board-item'}
            onClick={() => {
              switchBoard(b.id);
              closeOnSmallScreens();
            }}
            onDoubleClick={() => setRenaming(b.id)}
          >
            {renaming === b.id ? (
              <input
                autoFocus
                defaultValue={b.name}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  renameBoard(b.id, e.currentTarget.value);
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
            ) : (
              <>
                <span className="board-name">{b.name}</span>
                <span className="board-date">{timeAgo(b.updatedAt)}</span>
                <span className="board-actions">
                  <button
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(b.id);
                    }}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    title="Delete board"
                    className="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete “${b.name}”? This can't be undone.`)) deleteBoard(b.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
