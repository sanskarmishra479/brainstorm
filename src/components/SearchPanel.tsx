import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { focusNode } from '../lib/camera';
import { nodePlainText } from '../lib/nodes';
import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { CloseIcon, SearchIcon } from './Icons';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  return text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi')).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/** A short excerpt around the first match, so long cards still show why they matched. */
function snippet(text: string, query: string) {
  const flat = text.replace(/\s+/g, ' ');
  const i = flat.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return flat.slice(0, 80);
  const start = Math.max(0, i - 30);
  return (start > 0 ? '…' : '') + flat.slice(start, i + query.length + 50);
}

const TYPE_LABEL = { card: 'Card', text: 'Text', image: 'Image', link: 'Link', group: 'Group' } as const;

export function SearchPanel() {
  const open = useUI((s) => s.searchOpen);
  return open ? <SearchBox /> : null;
}

function SearchBox() {
  const nodes = useBoard((s) => s.nodes);
  const [query, setQuery] = useState('');
  // Index of the result last jumped to; -1 until the first jump.
  const [active, setActive] = useState(-1);
  const q = query.trim();

  const results = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return Object.values(nodes)
      .map((node) => ({ node, text: nodePlainText(node) }))
      .filter((r) => r.text.toLowerCase().includes(lower))
      .sort((a, b) => a.node.y - b.node.y || a.node.x - b.node.x);
  }, [nodes, q]);

  useEffect(() => {
    useUI.getState().setSearchMatches(q ? new Set(results.map((r) => r.node.id)) : null);
  }, [results, q]);
  useEffect(() => () => useUI.getState().setSearchMatches(null), []);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    setActive(i);
    focusNode(r.node.id);
    useBoard.getState().select([r.node.id]);
  };
  const close = () => useUI.getState().setSearchOpen(false);

  return (
    <div className="search-panel" onPointerDown={(e) => e.stopPropagation()}>
      <div className="search-input">
        <SearchIcon size={16} />
        <input
          autoFocus
          value={query}
          placeholder="Search this board"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            const n = results.length;
            if (e.key === 'Escape') close();
            else if (n && (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey))) {
              e.preventDefault();
              go((active + 1) % n);
            } else if (n && (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey))) {
              e.preventDefault();
              go(active <= 0 ? n - 1 : active - 1);
            }
          }}
        />
        {q && <span className="search-count">{results.length === 0 ? 'No matches' : active < 0 ? `${results.length} found` : `${active + 1} of ${results.length}`}</span>}
        <button className="search-close" title="Close (Esc)" onClick={close}>
          <CloseIcon />
        </button>
      </div>
      {results.length > 0 && (
        <ul className="search-results">
          {results.slice(0, 50).map((r, i) => {
            const [first, ...rest] = r.text.split('\n');
            const inTitle = first.toLowerCase().includes(q.toLowerCase());
            return (
              <li
                key={r.node.id}
                className={i === active ? 'active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(i)}
              >
                <span className={`result-dot color-${r.node.color}`} />
                <div className="result-text">
                  <div className="result-title">{highlight(first || 'Untitled', q)}</div>
                  {!inTitle && rest.length > 0 && <div className="result-snippet">{highlight(snippet(rest.join(' '), q), q)}</div>}
                </div>
                <span className="result-type">{TYPE_LABEL[r.node.type]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
