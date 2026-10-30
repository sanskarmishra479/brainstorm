import { useEffect, useState, type SyntheticEvent } from 'react';
import { lastDragMoved } from '../lib/interactions';
import { fetchLinkPreview, hostnameOf, normalizeUrl } from '../lib/media';
import { youtubeId } from '../lib/youtube';
import { useBoard } from '../store/board';
import type { LinkNode } from '../types';
import { ExternalIcon, LinkIcon, PlayIcon } from './Icons';

const stop = (e: SyntheticEvent) => e.stopPropagation();

/** A web link shown as a preview card (title, description, image). */
export function LinkContent({ node, editing }: { node: LinkNode; editing: boolean }) {
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => setIconFailed(false), [node.icon]);
  useEffect(() => {
    if (node.status === 'idle' && node.url) fetchLinkPreview(node.id);
  }, [node.id, node.status, node.url]);

  if (editing) return <LinkEditor node={node} />;

  const host = hostnameOf(node.url);
  const loading = node.status === 'loading' || node.status === 'idle';
  const video = youtubeId(node.url) !== null;

  return (
    <div className={`link-card${loading ? ' loading' : ''}`}>
      {loading && !node.image && <div className={video ? 'link-image video skeleton-block' : 'link-image skeleton-block'} />}
      {node.image && (
        <div className={video ? 'link-image video' : 'link-image'}>
          <img src={node.image} alt="" draggable={false} loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')} />
          {video && (
            <span className="play-badge">
              <PlayIcon />
            </span>
          )}
        </div>
      )}
      <div className="link-text">
        {loading ? (
          <>
            <div className="skeleton" style={{ width: '80%' }} />
            <div className="skeleton" style={{ width: '55%' }} />
          </>
        ) : (
          <>
            <div className="link-title">{node.title || host}</div>
            {node.description && <div className="link-desc">{node.description}</div>}
          </>
        )}
        <div className="link-site">
          {node.icon && !iconFailed ? (
            <img src={node.icon} alt="" referrerPolicy="no-referrer" draggable={false} onError={() => setIconFailed(true)} />
          ) : (
            <LinkIcon />
          )}
          <span>{node.siteName || host}</span>
          <a
            className="link-open"
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link in a new tab"
            onPointerDown={stop}
            onDoubleClick={stop}
            onClick={(e) => lastDragMoved && e.preventDefault()}
          >
            <ExternalIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

function LinkEditor({ node }: { node: LinkNode }) {
  const [value, setValue] = useState(node.url);
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const url = normalizeUrl(value);
    const s = useBoard.getState();
    if (!value.trim()) return s.setEditing(null);
    if (!url) return setInvalid(true);
    if (url !== node.url) s.updateNode(node.id, { url, status: 'idle', title: '', description: '', image: '', icon: '', siteName: '' });
    s.setEditing(null);
  };

  return (
    <div className="link-edit">
      <LinkIcon />
      <input
        autoFocus
        className={invalid ? 'invalid' : undefined}
        value={value}
        placeholder="Paste or type a link…"
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') useBoard.getState().setEditing(null);
        }}
      />
    </div>
  );
}
