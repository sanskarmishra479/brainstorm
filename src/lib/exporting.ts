import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { boundsOf } from './geometry';
import { rectOf } from './nodes';
import { normalizeGraph } from './normalize';
import { createBoard } from './persistence';

const PAD = 48;
const MAX_PIXELS = 8000;
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const currentName = () => {
  const s = useBoard.getState();
  return s.boards.find((b) => b.id === s.boardId)?.name ?? 'Board';
};

const fileSlug = (name: string) => name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'board';

function download(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * html-to-image drops CSS-only styling on SVG shapes, so connection lines come out as
 * filled black blobs. Copy their computed paint onto attributes for the capture.
 */
function inlineSvgPaint(root: HTMLElement) {
  const shapes = [...root.querySelectorAll<SVGElement>('svg path, svg line')];
  const saved = shapes.map((el) => ['fill', 'stroke', 'stroke-width', 'stroke-dasharray'].map((a) => [a, el.getAttribute(a)] as const));
  for (const el of shapes) {
    const cs = getComputedStyle(el);
    el.setAttribute('fill', cs.fill);
    el.setAttribute('stroke', cs.stroke);
    el.setAttribute('stroke-width', cs.strokeWidth);
    el.setAttribute('stroke-dasharray', cs.strokeDasharray);
  }
  return () =>
    shapes.forEach((el, i) =>
      saved[i].forEach(([a, v]) => (v === null ? el.removeAttribute(a) : el.setAttribute(a, v))),
    );
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Render every node on the board (not just what's on screen) to an image data URL. */
async function renderBoard(format: 'png' | 'jpeg' = 'png') {
  const { toJpeg, toPng } = await import('html-to-image');
  const s = useBoard.getState();
  const b = boundsOf(Object.values(s.nodes).map(rectOf));
  if (!b) throw new Error('This board is empty.');
  const world = document.querySelector<HTMLElement>('.world');
  if (!world) throw new Error('Canvas not found.');

  // Capture without selection outlines, toolbars or an open editor.
  const selection = { ids: s.selectedIds, edge: s.selectedEdgeId };
  s.setEditing(null);
  s.clearSelection();
  await nextFrame();

  const width = Math.ceil(b.width + PAD * 2);
  const height = Math.ceil(b.height + PAD * 2);
  const restorePaint = inlineSvgPaint(world);
  try {
    const dataUrl = await (format === 'png' ? toPng : toJpeg)(world, {
      quality: 0.92,
      width,
      height,
      pixelRatio: Math.min(2, MAX_PIXELS / Math.max(width, height)),
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      style: { transform: `translate(${PAD - b.x}px, ${PAD - b.y}px)`, width: `${width}px`, height: `${height}px` },
      filter: (el) => !(el instanceof HTMLElement && /\b(handle|floating-toolbar|marquee|resize-x|resize-corner)\b/.test(el.className)),
      // Cross-origin images (link previews) can't always be read; leave a blank instead of failing.
      imagePlaceholder: TRANSPARENT_PIXEL,
    });
    return { dataUrl, width, height };
  } finally {
    restorePaint();
    useBoard.getState().select(selection.ids);
    if (selection.edge) useBoard.getState().selectEdge(selection.edge);
  }
}

async function run(task: () => Promise<void>) {
  try {
    await task();
  } catch (err) {
    useUI.getState().toast(err instanceof Error ? err.message : 'Export failed.', 'error');
  }
}

export const exportPng = () =>
  run(async () => {
    const { dataUrl } = await renderBoard();
    download(dataUrl, `${fileSlug(currentName())}.png`);
  });

export const exportPdf = () =>
  run(async () => {
    // JPEG keeps the PDF a reasonable size; a lossless PNG page is several times larger.
    const [{ jsPDF }, image] = await Promise.all([import('jspdf'), renderBoard('jpeg')]);
    // PDF pages top out around 14,400 units, so very large boards are scaled down to fit.
    const scale = Math.min(1, 14000 / Math.max(image.width, image.height));
    const w = image.width * scale;
    const h = image.height * scale;
    const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
    pdf.addImage(image.dataUrl, 'JPEG', 0, 0, w, h);
    pdf.save(`${fileSlug(currentName())}.pdf`);
  });

const FILE_TAG = 'brainstorm-board';

export const exportJson = () =>
  run(async () => {
    const s = useBoard.getState();
    const file = {
      format: FILE_TAG,
      version: 2,
      name: currentName(),
      exportedAt: new Date().toISOString(),
      nodes: Object.values(s.nodes),
      edges: Object.values(s.edges),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    download(url, `${fileSlug(file.name)}.brainstorm.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

/** Pick a board file and open it as a new board. */
export function importJson() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () =>
    run(async () => {
      const file = input.files?.[0];
      if (!file) return;
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error('That file isn’t valid JSON.');
      }
      const { nodes, edges } = normalizeGraph(raw?.nodes, raw?.edges);
      if (Object.keys(nodes).length === 0) throw new Error('No cards found in that file.');
      const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : file.name.replace(/(\.brainstorm)?\.json$/i, '');
      await createBoard(name, { nodes, edges });
      useUI.getState().toast(`Imported “${name}”`);
    });
  input.click();
}
