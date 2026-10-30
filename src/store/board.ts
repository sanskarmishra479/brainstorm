import { create } from 'zustand';
import { boundsOf } from '../lib/geometry';
import {
  createCard,
  createGroup,
  expandWithContents,
  GROUP_HEADER,
  GROUP_PAD,
  isGroup,
  rectOf,
  uid,
  CARD_WIDTH,
} from '../lib/nodes';
import type { BoardData, BoardMeta, BoardNode, Edge, NodePatch, Viewport } from '../types';

export type Tool = 'select' | 'hand';

/** A connection being dragged out of a node, ending at a world-space point. */
export interface PendingConnection {
  fromId: string;
  x: number;
  y: number;
}

/** An alignment guide line drawn while dragging, in world coordinates. */
export interface Guide {
  axis: 'x' | 'y';
  pos: number;
  start: number;
  end: number;
}

interface Snapshot {
  nodes: Record<string, BoardNode>;
  edges: Record<string, Edge>;
}

const HISTORY_LIMIT = 100;

interface BoardState {
  ready: boolean;
  boards: BoardMeta[];
  boardId: string;

  nodes: Record<string, BoardNode>;
  edges: Record<string, Edge>;
  viewport: Viewport;

  tool: Tool;
  selectedIds: string[];
  selectedEdgeId: string | null;
  editingId: string | null;
  editingEdgeId: string | null;
  pending: PendingConnection | null;
  dragging: boolean;
  guides: Guide[];

  past: Snapshot[];
  future: Snapshot[];

  /** Record the current nodes and edges as an undo step. Call before a change. */
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  addNode: (node: BoardNode, opts?: { select?: boolean; edit?: boolean }) => string;
  insertNodes: (nodes: BoardNode[], edges: Edge[]) => void;
  updateNode: (id: string, patch: NodePatch) => void;
  updateNodes: (ids: string[], patch: NodePatch) => void;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  addChild: (parentId: string) => string | null;
  deleteSelection: () => void;
  groupSelection: () => string | null;
  ungroup: (id: string) => void;

  connect: (from: string, to: string) => string | null;
  updateEdge: (id: string, patch: Partial<Edge>) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  selectEdge: (id: string) => void;
  clearSelection: () => void;
  setEditing: (id: string | null) => void;
  setEditingEdge: (id: string | null) => void;

  setViewport: (viewport: Viewport) => void;
  setTool: (tool: Tool) => void;
  setPending: (pending: PendingConnection | null) => void;
  setDragging: (dragging: boolean) => void;
  setGuides: (guides: Guide[]) => void;

  loadBoard: (boards: BoardMeta[], boardId: string, data: BoardData) => void;
  setBoards: (boards: BoardMeta[]) => void;
}

function withoutNodes(nodes: Record<string, BoardNode>, edges: Record<string, Edge>, ids: string[]) {
  const doomed = new Set(ids);
  return {
    nodes: Object.fromEntries(Object.entries(nodes).filter(([id]) => !doomed.has(id))),
    edges: Object.fromEntries(Object.entries(edges).filter(([, e]) => !doomed.has(e.from) && !doomed.has(e.to))),
  };
}

const edgeExists = (edges: Record<string, Edge>, from: string, to: string) =>
  Object.values(edges).some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from));

export const useBoard = create<BoardState>()((set, get) => ({
  ready: false,
  boards: [],
  boardId: '',
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  tool: 'select',
  selectedIds: [],
  selectedEdgeId: null,
  editingId: null,
  editingEdgeId: null,
  pending: null,
  dragging: false,
  guides: [],
  past: [],
  future: [],

  checkpoint: () =>
    set((s) => {
      const last = s.past[s.past.length - 1];
      if (last && last.nodes === s.nodes && last.edges === s.edges) return s;
      return { past: [...s.past.slice(-(HISTORY_LIMIT - 1)), { nodes: s.nodes, edges: s.edges }], future: [] };
    }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        past: s.past.slice(0, -1),
        future: [{ nodes: s.nodes, edges: s.edges }, ...s.future].slice(0, HISTORY_LIMIT),
        ...restore(s, prev),
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        past: [...s.past, { nodes: s.nodes, edges: s.edges }],
        future: s.future.slice(1),
        ...restore(s, next),
      };
    }),

  addNode: (node, opts = {}) => {
    get().checkpoint();
    set((s) => ({
      nodes: { ...s.nodes, [node.id]: node },
      ...(opts.select || opts.edit ? { selectedIds: [node.id], selectedEdgeId: null } : {}),
      ...(opts.edit ? { editingId: node.id } : {}),
    }));
    return node.id;
  },

  insertNodes: (nodes, edges) => {
    if (nodes.length === 0) return;
    get().checkpoint();
    set((s) => ({
      nodes: { ...s.nodes, ...Object.fromEntries(nodes.map((n) => [n.id, n])) },
      edges: { ...s.edges, ...Object.fromEntries(edges.map((e) => [e.id, e])) },
      selectedIds: nodes.map((n) => n.id),
      selectedEdgeId: null,
      editingId: null,
    }));
  },

  updateNode: (id, patch) =>
    set((s) => (s.nodes[id] ? { nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...patch } as BoardNode } } : s)),

  updateNodes: (ids, patch) =>
    set((s) => {
      const nodes = { ...s.nodes };
      for (const id of ids) if (nodes[id]) nodes[id] = { ...nodes[id], ...patch } as BoardNode;
      return { nodes };
    }),

  setPositions: (positions) =>
    set((s) => {
      const nodes = { ...s.nodes };
      for (const [id, p] of Object.entries(positions)) if (nodes[id]) nodes[id] = { ...nodes[id], x: p.x, y: p.y };
      return { nodes };
    }),

  addChild: (parentId) => {
    const parent = get().nodes[parentId];
    if (!parent || isGroup(parent)) return null;
    const x = parent.x + parent.width + 100;
    const h = Math.max(parent.height, 60);
    const overlaps = (y: number) =>
      Object.values(get().nodes).some(
        (n) =>
          !isGroup(n) &&
          n.x < x + CARD_WIDTH &&
          n.x + n.width > x &&
          n.y < y + h &&
          n.y + Math.max(n.height, 60) > y,
      );
    let y = parent.y;
    for (let i = 0; i < 100 && overlaps(y); i++) y += 40;
    const child = createCard(x, y);
    const edge: Edge = { id: uid(), from: parentId, to: child.id, label: '' };
    get().checkpoint();
    set((s) => ({
      nodes: { ...s.nodes, [child.id]: child },
      edges: { ...s.edges, [edge.id]: edge },
      selectedIds: [child.id],
      selectedEdgeId: null,
      editingId: child.id,
    }));
    return child.id;
  },

  deleteSelection: () => {
    const s = get();
    const ids = expandWithContents(s.nodes, s.selectedIds);
    if (ids.length === 0 && !s.selectedEdgeId) return;
    s.checkpoint();
    set((st) => {
      const next = withoutNodes(st.nodes, st.edges, ids);
      if (st.selectedEdgeId) delete next.edges[st.selectedEdgeId];
      return { ...next, selectedIds: [], selectedEdgeId: null, editingId: null, editingEdgeId: null };
    });
  },

  groupSelection: () => {
    const s = get();
    const b = boundsOf(s.selectedIds.map((id) => s.nodes[id]).filter(Boolean).map(rectOf));
    if (!b) return null;
    const group = createGroup(
      b.x - GROUP_PAD,
      b.y - GROUP_PAD - GROUP_HEADER,
      b.width + GROUP_PAD * 2,
      b.height + GROUP_PAD * 2 + GROUP_HEADER,
    );
    return s.addNode(group, { select: true });
  },

  ungroup: (id) => {
    if (get().nodes[id]?.type !== 'group') return;
    get().checkpoint();
    set((s) => ({
      ...withoutNodes(s.nodes, s.edges, [id]),
      selectedIds: s.selectedIds.filter((x) => x !== id),
    }));
  },

  connect: (from, to) => {
    const { nodes, edges } = get();
    if (from === to || !nodes[from] || !nodes[to] || isGroup(nodes[from]) || isGroup(nodes[to])) return null;
    if (edgeExists(edges, from, to)) return null;
    const id = uid();
    get().checkpoint();
    set((s) => ({ edges: { ...s.edges, [id]: { id, from, to, label: '' } } }));
    return id;
  },

  updateEdge: (id, patch) =>
    set((s) => (s.edges[id] ? { edges: { ...s.edges, [id]: { ...s.edges[id], ...patch } } } : s)),

  select: (ids) => set({ selectedIds: ids, selectedEdgeId: null }),
  toggleSelect: (id) =>
    set((s) => ({
      selectedEdgeId: null,
      selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id],
    })),
  selectAll: () => set((s) => ({ selectedIds: Object.keys(s.nodes), selectedEdgeId: null })),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedIds: [] }),
  clearSelection: () => set({ selectedIds: [], selectedEdgeId: null }),

  setEditing: (id) => {
    // Let the focused field commit (its blur handler) before the editor unmounts.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const s = get();
    if (s.editingId === id) return;
    // A text note or link left empty is discarded rather than kept as a blank node.
    const prev = s.editingId ? s.nodes[s.editingId] : null;
    if ((prev?.type === 'text' && !prev.text.trim()) || (prev?.type === 'link' && !prev.url)) {
      set((st) => ({ ...withoutNodes(st.nodes, st.edges, [prev.id]), selectedIds: st.selectedIds.filter((x) => x !== prev.id) }));
    }
    if (id) get().checkpoint();
    set({ editingId: id, editingEdgeId: null });
  },

  setEditingEdge: (id) => {
    if (id) get().checkpoint();
    set((s) => ({ editingEdgeId: id, selectedEdgeId: id ?? s.selectedEdgeId, editingId: id ? null : s.editingId }));
  },

  setViewport: (viewport) => set({ viewport }),
  setTool: (tool) => set({ tool }),
  setPending: (pending) => set({ pending }),
  setDragging: (dragging) => set({ dragging }),
  setGuides: (guides) => set((s) => (guides.length === 0 && s.guides.length === 0 ? s : { guides })),

  loadBoard: (boards, boardId, data) =>
    set({
      ready: true,
      boards,
      boardId,
      ...data,
      selectedIds: [],
      selectedEdgeId: null,
      editingId: null,
      editingEdgeId: null,
      pending: null,
      guides: [],
      past: [],
      future: [],
    }),

  setBoards: (boards) => set({ boards }),
}));

function restore(s: BoardState, snap: Snapshot) {
  return {
    nodes: snap.nodes,
    edges: snap.edges,
    selectedIds: s.selectedIds.filter((id) => snap.nodes[id]),
    selectedEdgeId: s.selectedEdgeId && snap.edges[s.selectedEdgeId] ? s.selectedEdgeId : null,
    editingId: null,
    editingEdgeId: null,
  };
}
