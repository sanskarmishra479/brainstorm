import {
  NODE_COLORS,
  TEXT_SIZES,
  type BoardData,
  type BoardNode,
  type Edge,
  type LinkStatus,
  type NodeColor,
  type TextSize,
  type Viewport,
} from '../types';
import { CARD_WIDTH, LINK_WIDTH, TEXT_WIDTH } from './nodes';
import { PREVIEW_VERSION } from './media';
import { normalizeDoc } from './richtext';

/**
 * Turn untrusted data (old saves, imported files, clipboard) into valid nodes and edges.
 * Anything unrecognisable is dropped rather than crashing the board.
 */

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const httpUrl = (v: unknown) => (typeof v === 'string' && /^https?:\/\//i.test(v) ? v : '');
const imageSrc = (v: unknown) => (typeof v === 'string' && /^data:image\//i.test(v) ? v : httpUrl(v));
const LINK_STATUSES = ['idle', 'loading', 'ready', 'error'];
const color = (v: unknown): NodeColor => (NODE_COLORS.includes(v as NodeColor) ? (v as NodeColor) : 'white');

export function normalizeNode(raw: unknown): BoardNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!id) return null;
  const common = { id, x: num(r.x, 0), y: num(r.y, 0), height: num(r.height, 0), color: color(r.color) };
  // Version-1 boards stored cards without a `type`.
  const type = str(r.type, 'card');

  switch (type) {
    case 'card':
      return {
        ...common,
        type,
        width: num(r.width, CARD_WIDTH),
        title: str(r.title),
        body: normalizeDoc(r.body),
        collapsed: r.collapsed === true,
      };
    case 'text':
      return {
        ...common,
        type,
        width: num(r.width, TEXT_WIDTH),
        text: str(r.text),
        size: TEXT_SIZES.includes(r.size as TextSize) ? (r.size as TextSize) : 'm',
      };
    case 'image': {
      const src = imageSrc(r.src);
      if (!src) return null;
      return { ...common, type, width: num(r.width, 280), src, caption: str(r.caption), aspect: num(r.aspect, 0.75) || 0.75 };
    }
    case 'link': {
      const url = httpUrl(r.url);
      // Fetch again if it was mid-fetch when the page closed, or was made by an older fetcher.
      const previewVersion = num(r.previewVersion, 0);
      const stale = r.status === 'loading' || previewVersion < PREVIEW_VERSION;
      const status = LINK_STATUSES.includes(str(r.status)) && !stale ? (r.status as LinkStatus) : 'idle';
      return {
        ...common,
        type,
        width: num(r.width, LINK_WIDTH),
        url,
        title: str(r.title),
        description: str(r.description),
        image: httpUrl(r.image),
        icon: httpUrl(r.icon),
        siteName: str(r.siteName),
        status: url ? status : 'idle',
        previewVersion,
      };
    }
    case 'group':
      return { ...common, type, width: num(r.width, 400), height: num(r.height, 300), title: str(r.title) };
    default:
      return null;
  }
}

export function normalizeEdge(raw: unknown, nodes: Record<string, BoardNode>): Edge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const from = str(r.from);
  const to = str(r.to);
  if (!id || !nodes[from] || !nodes[to]) return null;
  return { id, from, to, label: str(r.label) };
}

function toList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}

export function normalizeGraph(rawNodes: unknown, rawEdges: unknown) {
  const nodes: Record<string, BoardNode> = {};
  for (const n of toList(rawNodes).map(normalizeNode)) if (n) nodes[n.id] = n;
  const edges: Record<string, Edge> = {};
  for (const e of toList(rawEdges).map((e) => normalizeEdge(e, nodes))) if (e) edges[e.id] = e;
  return { nodes, edges };
}

export function normalizeViewport(raw: unknown): Viewport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const zoom = num(r.zoom, 0);
  return zoom > 0 ? { x: num(r.x, 0), y: num(r.y, 0), zoom } : null;
}

export function normalizeBoardData(raw: unknown, fallbackViewport: Viewport): BoardData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    ...normalizeGraph(r.nodes ?? r.cards, r.edges),
    viewport: normalizeViewport(r.viewport) ?? fallbackViewport,
  };
}
