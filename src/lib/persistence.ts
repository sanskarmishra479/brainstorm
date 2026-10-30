import { del, get, set } from 'idb-keyval';
import { useBoard } from '../store/board';
import type { BoardData, BoardMeta, Viewport } from '../types';
import { fitAfterLayout } from './camera';
import { boundsOf } from './geometry';
import { rectOf, uid } from './nodes';
import { normalizeBoardData } from './normalize';
import { learnAiBoard } from './welcome';

/**
 * Boards live in IndexedDB: one key for the board list and one key per board.
 * Only the open board is held in memory; it autosaves shortly after each change.
 */

interface BoardIndex {
  boards: BoardMeta[];
  currentId: string;
  /** Which starter board this device has received, so a new one is added once, not on every load. */
  starterVersion?: number;
}

const STARTER_VERSION = 2;

const INDEX_KEY = 'brainstorm:index';
const boardKey = (id: string) => `brainstorm:board:${id}`;
const LEGACY_KEY = 'brainstorm-board';

const centeredViewport = (): Viewport => ({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });

/** A viewport that frames the given content at 100%. */
function viewportForData(data: Omit<BoardData, 'viewport'>): Viewport {
  const b = boundsOf(Object.values(data.nodes).map((n) => ({ ...rectOf(n), height: n.height || 80 })));
  if (!b) return centeredViewport();
  return { zoom: 1, x: window.innerWidth / 2 - (b.x + b.width / 2), y: (window.innerHeight + 48) / 2 - (b.y + b.height / 2) };
}

export const emptyBoard = (): BoardData => ({ nodes: {}, edges: {}, viewport: centeredViewport() });

/** Boards from the first version were saved to localStorage by zustand's persist middleware. */
function readLegacyBoard(): BoardData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = normalizeBoardData(JSON.parse(raw)?.state, centeredViewport());
    return Object.keys(data.nodes).length ? data : null;
  } catch {
    return null;
  }
}

/** Save the starter roadmap as a new board and return its entry. */
async function addStarterBoard(): Promise<BoardMeta> {
  const now = Date.now();
  const meta: BoardMeta = { id: uid(), name: 'Learn AI faster', createdAt: now, updatedAt: now };
  const data = learnAiBoard();
  await set(boardKey(meta.id), { ...data, viewport: viewportForData(data) });
  return meta;
}

let initPromise: Promise<void> | null = null;

export function initBoards() {
  initPromise ??= (async () => {
    let index: BoardIndex = (await get<BoardIndex>(INDEX_KEY)) ?? { boards: [], currentId: '' };
    if (index.boards.length === 0) {
      const legacy = readLegacyBoard();
      if (legacy) {
        const now = Date.now();
        const meta: BoardMeta = { id: uid(), name: 'My first board', createdAt: now, updatedAt: now };
        await set(boardKey(meta.id), legacy);
        index = { ...index, boards: [meta], currentId: meta.id };
      }
    }
    // New devices, and devices that saw an older starter, get the current one added and opened.
    const addStarter = (index.starterVersion ?? 0) < STARTER_VERSION;
    if (addStarter) {
      const meta = await addStarterBoard();
      index = { boards: [meta, ...index.boards], currentId: meta.id, starterVersion: STARTER_VERSION };
      await set(INDEX_KEY, index);
    }
    const currentId = index.boards.some((b) => b.id === index.currentId) ? index.currentId : index.boards[0].id;
    const data = normalizeBoardData(await get(boardKey(currentId)), centeredViewport());
    useBoard.getState().loadBoard(index.boards, currentId, data);
    if (addStarter) fitAfterLayout();
    startAutosave();
  })();
  return initPromise;
}

// ---------- Autosave ----------

let timer = 0;
let contentDirty = false;

function startAutosave() {
  useBoard.subscribe((s, prev) => {
    if (!s.ready || s.boardId !== prev.boardId) return;
    const contentChanged = s.nodes !== prev.nodes || s.edges !== prev.edges;
    if (!contentChanged && s.viewport === prev.viewport) return;
    contentDirty ||= contentChanged;
    clearTimeout(timer);
    timer = window.setTimeout(flush, 400);
  });
  const flushNow = () => void flush();
  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushNow());
}

/** Write the open board (and, if its content changed, its timestamp) to storage. */
export async function flush() {
  clearTimeout(timer);
  const s = useBoard.getState();
  if (!s.ready || !s.boardId) return;
  const writes: Promise<void>[] = [set(boardKey(s.boardId), { nodes: s.nodes, edges: s.edges, viewport: s.viewport })];
  if (contentDirty) {
    contentDirty = false;
    const boards = s.boards.map((b) => (b.id === s.boardId ? { ...b, updatedAt: Date.now() } : b));
    s.setBoards(boards);
    writes.push(saveIndex());
  }
  await Promise.all(writes);
}

function saveIndex() {
  const { boards, boardId } = useBoard.getState();
  return set(INDEX_KEY, { boards, currentId: boardId, starterVersion: STARTER_VERSION } satisfies BoardIndex);
}

// ---------- Board management ----------

export async function switchBoard(id: string) {
  const s = useBoard.getState();
  if (id === s.boardId) return;
  await flush();
  const data = normalizeBoardData(await get(boardKey(id)), centeredViewport());
  useBoard.getState().loadBoard(useBoard.getState().boards, id, data);
  await saveIndex();
}

export async function createBoard(name = 'Untitled board', data?: Omit<BoardData, 'viewport'>) {
  await flush();
  const now = Date.now();
  const meta: BoardMeta = { id: uid(), name, createdAt: now, updatedAt: now };
  const board: BoardData = data ? { ...data, viewport: viewportForData(data) } : emptyBoard();
  await set(boardKey(meta.id), board);
  useBoard.getState().loadBoard([meta, ...useBoard.getState().boards], meta.id, board);
  if (data) fitAfterLayout();
  await saveIndex();
  return meta.id;
}

export async function renameBoard(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const s = useBoard.getState();
  s.setBoards(s.boards.map((b) => (b.id === id ? { ...b, name: trimmed } : b)));
  await saveIndex();
}

export async function deleteBoard(id: string) {
  const s = useBoard.getState();
  const remaining = s.boards.filter((b) => b.id !== id);
  if (remaining.length === 0) {
    await createBoard();
  } else if (id === s.boardId) {
    const next = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const data = normalizeBoardData(await get(boardKey(next.id)), centeredViewport());
    useBoard.getState().loadBoard(useBoard.getState().boards, next.id, data);
  }
  useBoard.getState().setBoards(useBoard.getState().boards.filter((b) => b.id !== id));
  await Promise.all([del(boardKey(id)), saveIndex()]);
}
