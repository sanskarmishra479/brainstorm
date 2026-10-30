# Brainstorm

A visual brainstorming and mind-mapping app on an infinite canvas, inspired by Milanote, Heptabase and Scrintal.

## Features

- **Infinite canvas** with smooth pan and zoom, dot grid, minimap and fit-to-content
- **Cards** with rich text (bold, headings, lists, checklists), colors and collapse
- **Text notes**, **image cards** (upload, paste or drag in) and **link cards** with Open Graph previews and YouTube thumbnails
- **Curved connections** with arrowheads and labels; drag from a card's dot to connect or create
- **Groups** that move their contents, plus box-select, copy/paste, duplicate and undo/redo
- **Snapping** with alignment guides, optional snap-to-grid and one-click **tidy-up** layout
- **Multiple boards**, search, dark mode, PNG/PDF export and board-file import/export
- **Touch support**: pinch to zoom, double-tap to create or edit

Boards are saved locally in your browser (IndexedDB).

## Getting started

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173). Press `?` in the app for keyboard shortcuts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |

## Link previews

Link cards are filled in by a small endpoint, `/api/link-preview` (`server/linkPreview.ts`), that runs inside the Vite dev and preview servers. It reads a page's Open Graph tags server-side, since browsers can't fetch other sites directly. It only fetches public `http(s)` addresses. When the app is hosted as static files, previews fall back to the free Microlink API, which has a daily limit.

## Tech

React, TypeScript, Vite, Zustand, TipTap, idb-keyval, html-to-image and jsPDF.
