import type { BoardNode, CardNode, GroupNode, ImageNode, LinkNode, NodeColor, NodeType, TextNode } from '../types';
import { docToText } from './richtext';
import { containsRect, type Rect } from './geometry';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const CARD_WIDTH = 220;
export const TEXT_WIDTH = 280;
export const LINK_WIDTH = 280;
export const GROUP_HEADER = 36;
export const GROUP_PAD = 28;

/** Width/height limits used when resizing. */
export const SIZE_LIMITS: Record<NodeType, { minW: number; maxW: number; minH: number }> = {
  card: { minW: 160, maxW: 560, minH: 0 },
  text: { minW: 80, maxW: 1000, minH: 0 },
  image: { minW: 80, maxW: 1600, minH: 0 },
  link: { minW: 200, maxW: 520, minH: 0 },
  group: { minW: 200, maxW: 6000, minH: 120 },
};

const base = (x: number, y: number, width: number) => ({
  id: uid(),
  x,
  y,
  width,
  height: 0,
  color: 'white' as NodeColor,
});

export const createCard = (x: number, y: number, patch: Partial<CardNode> = {}): CardNode => ({
  ...base(x, y, CARD_WIDTH),
  type: 'card',
  title: '',
  body: null,
  collapsed: false,
  ...patch,
});

export const createText = (x: number, y: number, patch: Partial<TextNode> = {}): TextNode => ({
  ...base(x, y, TEXT_WIDTH),
  type: 'text',
  text: '',
  size: 'm',
  ...patch,
});

export const createImage = (x: number, y: number, patch: Partial<ImageNode> = {}): ImageNode => ({
  ...base(x, y, 280),
  type: 'image',
  src: '',
  caption: '',
  aspect: 0.75,
  ...patch,
});

export const createLink = (x: number, y: number, patch: Partial<LinkNode> = {}): LinkNode => ({
  ...base(x, y, LINK_WIDTH),
  type: 'link',
  url: '',
  title: '',
  description: '',
  image: '',
  icon: '',
  siteName: '',
  status: 'idle',
  previewVersion: 0,
  ...patch,
});

export const createGroup = (x: number, y: number, width: number, height: number, patch: Partial<GroupNode> = {}): GroupNode => ({
  ...base(x, y, width),
  height,
  type: 'group',
  title: '',
  color: 'blue',
  ...patch,
});

export const isGroup = (n: BoardNode): n is GroupNode => n.type === 'group';

export const rectOf = (n: BoardNode): Rect => ({ x: n.x, y: n.y, width: n.width, height: n.height });

/** The given ids plus everything sitting inside any group among them. */
export function expandWithContents(nodes: Record<string, BoardNode>, ids: string[]): string[] {
  const result = new Set(ids.filter((id) => nodes[id]));
  for (const id of ids) {
    const group = nodes[id];
    if (!group || !isGroup(group)) continue;
    const area = rectOf(group);
    for (const n of Object.values(nodes)) {
      if (n.id !== id && containsRect(area, rectOf(n))) result.add(n.id);
    }
  }
  return [...result];
}

export function nodePlainText(n: BoardNode): string {
  switch (n.type) {
    case 'card':
      return [n.title, docToText(n.body)].filter(Boolean).join('\n');
    case 'text':
      return n.text;
    case 'image':
      return n.caption;
    case 'link':
      return [n.title, n.url].filter(Boolean).join('\n');
    case 'group':
      return n.title;
  }
}
