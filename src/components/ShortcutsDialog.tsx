import { useEffect } from 'react';
import { useUI } from '../store/ui';
import { CloseIcon } from './Icons';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Create',
    items: [
      ['Double-click canvas', 'New card'],
      ['N', 'New card'],
      ['T', 'New text'],
      ['Tab', 'Connected child card'],
      [`${MOD} G`, 'Group selection'],
      ['Paste', 'Text, image or link'],
    ],
  },
  {
    title: 'Edit',
    items: [
      ['Enter', 'Edit selected'],
      ['Esc', 'Finish editing / deselect'],
      [`${MOD} Z`, 'Undo'],
      [`${MOD} Shift Z`, 'Redo'],
      [`${MOD} C / X / V`, 'Copy, cut, paste'],
      [`${MOD} D`, 'Duplicate'],
      ['Delete', 'Delete selection'],
      [`${MOD} Shift G`, 'Ungroup'],
      ['Shift T', 'Tidy up'],
    ],
  },
  {
    title: 'Navigate',
    items: [
      ['Scroll', 'Pan'],
      [`${MOD} Scroll`, 'Zoom'],
      ['Space + drag', 'Pan'],
      ['H / V', 'Hand / select tool'],
      [`${MOD} + / −`, 'Zoom in / out'],
      [`${MOD} 0`, 'Zoom to 100%'],
      ['Shift 1', 'Fit everything'],
      [`${MOD} F`, 'Search'],
      ['Arrows', 'Nudge (Shift: 10px)'],
      ['Alt + drag', 'Move without snapping'],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUI((s) => s.shortcutsOpen);
  const close = () => useUI.getState().setShortcutsOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onPointerDown={close}>
      <div className="dialog" role="dialog" aria-label="Keyboard shortcuts" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <span>Keyboard shortcuts</span>
          <button className="icon-btn" title="Close" onClick={close}>
            <CloseIcon />
          </button>
        </div>
        <div className="shortcut-grid">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.items.map(([keys, label]) => (
                <div key={keys + label} className="shortcut-row">
                  <span>{label}</span>
                  <kbd>{keys}</kbd>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
