import { useBoard } from '../store/board';
import type { BoardNode, Edge } from '../types';
import { addCardFromText } from './actions';
import { placementPoint } from './camera';
import { boundsOf, type Point } from './geometry';
import { expandWithContents, nodePlainText, rectOf, uid } from './nodes';
import { addImageFiles, addLinkAt, normalizeUrl } from './media';
import { normalizeGraph } from './normalize';
import { isTypingTarget } from './pointer';

/**
 * Copy/paste of nodes. Copied content is written to the system clipboard as
 * plain text (for other apps) plus a custom type carrying the full nodes and
 * edges, so it can be pasted into another board or browser tab.
 */

const MIME = 'application/x-brainstorm';

interface Payload {
  nodes: BoardNode[];
  edges: Edge[];
}

/** Fallback for browsers that drop custom clipboard types. */
let lastCopy: { text: string; payload: Payload } | null = null;

function selectionPayload(): Payload | null {
  const s = useBoard.getState();
  const ids = expandWithContents(s.nodes, s.selectedIds);
  if (ids.length === 0) return null;
  const set = new Set(ids);
  return {
    nodes: ids.map((id) => s.nodes[id]),
    edges: Object.values(s.edges).filter((e) => set.has(e.from) && set.has(e.to)),
  };
}

/** Add copies of the payload with fresh ids, centered on `at` or offset from the originals. */
function insertCopy(payload: Payload, at: Point | null) {
  const b = boundsOf(payload.nodes.map(rectOf));
  if (!b) return;
  const dx = at ? at.x - (b.x + b.width / 2) : 30;
  const dy = at ? at.y - (b.y + b.height / 2) : 30;
  const ids = new Map(payload.nodes.map((n) => [n.id, uid()]));
  useBoard.getState().insertNodes(
    payload.nodes.map((n) => ({ ...n, id: ids.get(n.id)!, x: n.x + dx, y: n.y + dy })),
    payload.edges.map((e) => ({ ...e, id: uid(), from: ids.get(e.from)!, to: ids.get(e.to)! })),
  );
}

export function duplicateSelection() {
  const payload = selectionPayload();
  if (payload) insertCopy(payload, null);
}

function parsePayload(json: string): Payload | null {
  try {
    const raw = JSON.parse(json);
    const { nodes, edges } = normalizeGraph(raw?.nodes, raw?.edges);
    const list = Object.values(nodes);
    return list.length ? { nodes: list, edges: Object.values(edges) } : null;
  } catch {
    return null;
  }
}

function onCopy(e: ClipboardEvent, cut: boolean) {
  if (isTypingTarget(document.activeElement)) return;
  const payload = selectionPayload();
  if (!payload || !e.clipboardData) return;
  e.preventDefault();
  const text = payload.nodes.map(nodePlainText).filter(Boolean).join('\n\n');
  e.clipboardData.setData('text/plain', text);
  e.clipboardData.setData(MIME, JSON.stringify(payload));
  lastCopy = { text, payload };
  if (cut) useBoard.getState().deleteSelection();
}

function onPaste(e: ClipboardEvent) {
  if (isTypingTarget(document.activeElement) || !e.clipboardData) return;
  const data = e.clipboardData;
  e.preventDefault();

  const custom = data.getData(MIME);
  const payload = custom ? parsePayload(custom) : null;
  if (payload) return insertCopy(payload, placementPoint());

  const images = [...data.files].filter((f) => f.type.startsWith('image/'));
  if (images.length) return void addImageFiles(images, placementPoint());

  const text = data.getData('text/plain');
  if (lastCopy && text === lastCopy.text) return insertCopy(lastCopy.payload, placementPoint());
  const url = /^\S+$/.test(text.trim()) && /[./]/.test(text) ? normalizeUrl(text) : null;
  if (url) return void addLinkAt(url, placementPoint());
  if (text.trim()) addCardFromText(text);
}

export function installClipboard() {
  const copy = (e: ClipboardEvent) => onCopy(e, false);
  const cut = (e: ClipboardEvent) => onCopy(e, true);
  document.addEventListener('copy', copy);
  document.addEventListener('cut', cut);
  document.addEventListener('paste', onPaste);
  return () => {
    document.removeEventListener('copy', copy);
    document.removeEventListener('cut', cut);
    document.removeEventListener('paste', onPaste);
  };
}
