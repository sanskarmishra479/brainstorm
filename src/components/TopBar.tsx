import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fitToContent, resetZoom, zoomBy } from '../lib/camera';
import { exportJson, exportPdf, exportPng, importJson } from '../lib/exporting';
import { tidyUp } from '../lib/layout';
import { renameBoard } from '../lib/persistence';
import { cycleTheme } from '../lib/theme';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import {
  DownloadIcon,
  FitIcon,
  GridIcon,
  KeyboardIcon,
  MonitorIcon,
  MoonIcon,
  MoreIcon,
  RedoIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
  TidyIcon,
  UndoIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './Icons';

export function TopBar() {
  const zoom = useBoard((s) => s.viewport.zoom);
  const canUndo = useBoard((s) => s.past.length > 0);
  const canRedo = useBoard((s) => s.future.length > 0);
  const board = useBoard((s) => s.boards.find((b) => b.id === s.boardId));
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const searchOpen = useUI((s) => s.searchOpen);
  const snapToGrid = useUI((s) => s.snapToGrid);
  const theme = useUI((s) => s.theme);
  const ui = useUI.getState();
  const [renaming, setRenaming] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-group">
        <button className={`icon-btn${sidebarOpen ? ' active' : ''}`} title="Boards" onClick={ui.toggleSidebar}>
          <SidebarIcon />
        </button>
        <div className="logo">
          <span className="logo-mark" />
          <span className="logo-text">Brainstorm</span>
        </div>
        <nav className="crumbs">
          <button className="crumb" onClick={ui.toggleSidebar}>
            My Boards
          </button>
          <span className="crumb-sep">/</span>
          {renaming ? (
            <input
              className="crumb-input"
              autoFocus
              defaultValue={board?.name}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => {
                if (board) renameBoard(board.id, e.currentTarget.value);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setRenaming(false);
              }}
            />
          ) : (
            <button className="crumb current" title="Rename board" onClick={() => setRenaming(true)}>
              {board?.name}
            </button>
          )}
        </nav>
      </div>

      <div className="topbar-group">
        <button className="icon-btn" title="Undo (Ctrl Z)" disabled={!canUndo} onClick={() => useBoard.getState().undo()}>
          <UndoIcon />
        </button>
        <button className="icon-btn" title="Redo (Ctrl Shift Z)" disabled={!canRedo} onClick={() => useBoard.getState().redo()}>
          <RedoIcon />
        </button>
        <span className="topbar-sep" />
        <button className={`icon-btn${searchOpen ? ' active' : ''}`} title="Search (Ctrl F)" onClick={() => ui.setSearchOpen(!searchOpen)}>
          <SearchIcon />
        </button>
        <button className="icon-btn hide-sm" title="Zoom out (Ctrl −)" onClick={() => zoomBy(0.8)}>
          <ZoomOutIcon />
        </button>
        <button className="zoom-label" title="Reset to 100% (Ctrl 0)" onClick={resetZoom}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn hide-sm" title="Zoom in (Ctrl +)" onClick={() => zoomBy(1.25)}>
          <ZoomInIcon />
        </button>
        <button className="icon-btn" title="Fit to content (Shift 1)" onClick={fitToContent}>
          <FitIcon />
        </button>
        <span className="topbar-sep hide-sm" />
        <button
          className={`icon-btn hide-sm${snapToGrid ? ' active' : ''}`}
          title={snapToGrid ? 'Snap to grid: on' : 'Snap to grid: off'}
          onClick={() => ui.setPref('snapToGrid', !snapToGrid)}
        >
          <GridIcon />
        </button>
        <button className="icon-btn" title={`Theme: ${theme}`} onClick={cycleTheme}>
          {theme === 'light' ? <SunIcon /> : theme === 'dark' ? <MoonIcon /> : <MonitorIcon />}
        </button>
        <Menu />
      </div>
    </header>
  );
}

function Menu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = (icon: ReactNode, label: string, run: () => void, hint?: string) => (
    <button
      className="menu-item"
      onClick={() => {
        setOpen(false);
        run();
      }}
    >
      {icon}
      <span>{label}</span>
      {hint && <kbd>{hint}</kbd>}
    </button>
  );

  return (
    <div className="menu" ref={ref}>
      <button className={`icon-btn${open ? ' active' : ''}`} title="More" onClick={() => setOpen(!open)}>
        <MoreIcon />
      </button>
      {open && (
        <div className="menu-panel">
          {item(<TidyIcon />, 'Tidy up layout', tidyUp, 'Shift T')}
          <div className="menu-sep" />
          {item(<DownloadIcon />, 'Export as PNG', exportPng)}
          {item(<DownloadIcon />, 'Export as PDF', exportPdf)}
          {item(<DownloadIcon />, 'Export board file', exportJson)}
          {item(<UploadIcon />, 'Import board file…', importJson)}
          <div className="menu-sep" />
          {item(<KeyboardIcon />, 'Keyboard shortcuts', () => useUI.getState().setShortcutsOpen(true), '?')}
        </div>
      )}
    </div>
  );
}
