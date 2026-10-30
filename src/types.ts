import type { JSONContent } from '@tiptap/core';

/** Rich text stored as TipTap/ProseMirror JSON. */
export type RichDoc = JSONContent;

export type NodeColor = 'white' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';
export const NODE_COLORS: NodeColor[] = ['white', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

interface BaseNode {
  id: string;
  x: number;
  y: number;
  width: number;
  /** Measured from the DOM for content nodes; set by the user for groups. */
  height: number;
  color: NodeColor;
}

export interface CardNode extends BaseNode {
  type: 'card';
  title: string;
  body: RichDoc | null;
  collapsed: boolean;
}

export type TextSize = 's' | 'm' | 'l' | 'xl';
export const TEXT_SIZES: TextSize[] = ['s', 'm', 'l', 'xl'];

export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  size: TextSize;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  title: string;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  /** A data: URL (uploaded) or an http(s) URL. */
  src: string;
  caption: string;
  /** height / width of the image itself, so the frame keeps its shape while resizing. */
  aspect: number;
}

export type LinkStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LinkNode extends BaseNode {
  type: 'link';
  url: string;
  title: string;
  description: string;
  image: string;
  icon: string;
  siteName: string;
  status: LinkStatus;
  /** Bumped when preview fetching improves, so older stored previews are fetched again once. */
  previewVersion: number;
}

export type BoardNode = CardNode | TextNode | ImageNode | LinkNode | GroupNode;
export type NodeType = BoardNode['type'];

type PatchOf<T> = Partial<Omit<T, 'id' | 'type'>>;
export type NodePatch =
  | PatchOf<CardNode>
  | PatchOf<TextNode>
  | PatchOf<ImageNode>
  | PatchOf<LinkNode>
  | PatchOf<GroupNode>;

export interface Edge {
  id: string;
  from: string;
  to: string;
  label: string;
}

/** Screen position of the world origin, plus scale. */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface BoardMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface BoardData {
  nodes: Record<string, BoardNode>;
  edges: Record<string, Edge>;
  viewport: Viewport;
}
