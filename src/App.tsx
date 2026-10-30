import { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Dock } from './components/Dock';
import { Minimap } from './components/Minimap';
import { SearchPanel } from './components/SearchPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { installClipboard } from './lib/clipboard';
import { initBoards } from './lib/persistence';
import { installShortcuts } from './lib/shortcuts';
import { useBoard } from './store/board';

export function App() {
  const ready = useBoard((s) => s.ready);

  useEffect(() => {
    initBoards();
    const removeShortcuts = installShortcuts();
    const removeClipboard = installClipboard();
    return () => {
      removeShortcuts();
      removeClipboard();
    };
  }, []);

  if (!ready) return <div className="loading" />;

  return (
    <>
      <Canvas />
      <TopBar />
      <Sidebar />
      <SearchPanel />
      <Minimap />
      <Dock />
      <Toasts />
      <ShortcutsDialog />
    </>
  );
}
