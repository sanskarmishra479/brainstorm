import { create } from 'zustand';

export type Theme = 'system' | 'light' | 'dark';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

export interface ContextMenuState {
  /** Screen position of the click. */
  x: number;
  y: number;
  target: 'node' | 'edge' | 'canvas';
  /** Board position of the click, for "add here" and "paste here". */
  world: { x: number; y: number };
}

/** Per-device preferences, remembered in localStorage. */
interface Prefs {
  theme: Theme;
  snapToGrid: boolean;
  minimapOpen: boolean;
}

const PREFS_KEY = 'brainstorm:prefs';
const defaultPrefs: Prefs = { theme: 'system', snapToGrid: false, minimapOpen: true };

function loadPrefs(): Prefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return defaultPrefs;
  }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode); preferences then last for the session.
  }
}

/** View-only state that isn't part of a board. */
interface UIState extends Prefs {
  sidebarOpen: boolean;
  searchOpen: boolean;
  shortcutsOpen: boolean;
  /** Ids matching the current search, or null when not searching. Non-matches are dimmed. */
  searchMatches: Set<string> | null;
  toasts: Toast[];
  contextMenu: ContextMenuState | null;

  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSearchMatches: (matches: Set<string> | null) => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUI = create<UIState>()((set, get) => ({
  ...loadPrefs(),
  sidebarOpen: false,
  searchOpen: false,
  shortcutsOpen: false,
  searchMatches: null,
  toasts: [],
  contextMenu: null,

  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set((s) => (s.contextMenu ? { contextMenu: null } : s)),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchOpen: (searchOpen) => set(searchOpen ? { searchOpen } : { searchOpen, searchMatches: null }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setSearchMatches: (searchMatches) => set({ searchMatches }),

  setPref: (key, value) => {
    set({ [key]: value } as Partial<Prefs>);
    const { theme, snapToGrid, minimapOpen } = get();
    savePrefs({ theme, snapToGrid, minimapOpen });
  },

  toast: (text, kind = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
