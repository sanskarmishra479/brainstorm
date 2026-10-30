import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import type { NodePatch } from '../types';
import { clamp, type Point } from './geometry';
import { createImage, createLink } from './nodes';
import { youtubeId, youtubeThumbnail } from './youtube';

// ---------- Images ----------

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 1600;

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = src;
  });

/**
 * Read an image file into a data URL, downscaling large photos so boards stay
 * small. GIFs and SVGs are kept as-is to preserve animation and sharpness.
 */
async function readImage(file: File) {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const w = img.naturalWidth || 300;
  const h = img.naturalHeight || 200;
  const keep = file.type === 'image/gif' || file.type === 'image/svg+xml';
  let src = original;
  if (!keep && (Math.max(w, h) > MAX_DIMENSION || file.size > 600_000)) {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    src = canvas.toDataURL('image/webp', 0.85);
    if (!src.startsWith('data:image/webp')) src = canvas.toDataURL('image/jpeg', 0.85);
  }
  return { src, aspect: h / w, naturalWidth: w };
}

/** Add image files to the board side by side, centered on `at`. */
export async function addImageFiles(files: File[], at: Point) {
  const images = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_FILE_BYTES);
  const loaded = (await Promise.allSettled(images.map(readImage))).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const skipped = files.length - loaded.length;
  if (skipped > 0) useUI.getState().toast(`${skipped} file${skipped > 1 ? 's' : ''} couldn't be added (images up to 20 MB only).`, 'error');
  if (loaded.length === 0) return;
  const gap = 24;
  const widths = loaded.map((d) => clamp(d.naturalWidth, 120, 320));
  let x = at.x - (widths.reduce((a, b) => a + b, 0) + gap * (loaded.length - 1)) / 2;
  const nodes = loaded.map((d, i) => {
    const node = createImage(x, at.y - (widths[i] * d.aspect) / 2, { src: d.src, aspect: d.aspect, width: widths[i] });
    x += widths[i] + gap;
    return node;
  });
  const s = useBoard.getState();
  s.setTool('select');
  s.insertNodes(nodes, []);
}

/** Open the system file picker for images. */
export function pickImages(at: Point) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => input.files && addImageFiles([...input.files], at);
  input.click();
}

// ---------- Links ----------

/** Turn user input into an http(s) URL, or null if it doesn't look like one. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s || /\s/.test(s)) return null;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const url = new URL(s);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export const hostnameOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const httpOnly = (v: unknown) => (typeof v === 'string' && /^https?:\/\//i.test(v) ? v : '');
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Version of the preview pipeline below; stored previews from older versions are refreshed once. */
export const PREVIEW_VERSION = 3;

interface Preview {
  title: string;
  description: string;
  image: string;
  icon: string;
  siteName: string;
}

/** The app's own endpoint (server/linkPreview.ts), available under `npm run dev` / `npm run preview`. */
async function fromOwnServer(url: string): Promise<Preview> {
  const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
  // On a static host the path falls through to index.html, which isn't JSON.
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error('No preview endpoint');
  const d = await res.json();
  return { title: text(d.title), description: text(d.description), image: httpOnly(d.image), icon: httpOnly(d.icon), siteName: text(d.siteName) };
}

/** Fallback for static hosting: Microlink's free API (rate-limited to roughly 50 previews a day). */
async function fromMicrolink(url: string): Promise<Preview> {
  const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
  const json = await res.json();
  if (json?.status !== 'success') throw new Error('Preview unavailable');
  const d = json.data ?? {};
  return { title: text(d.title), description: text(d.description), image: httpOnly(d.image?.url), icon: httpOnly(d.logo?.url), siteName: text(d.publisher) };
}

const inFlight = new Set<string>();

/** Fetch title, description, image and icon for a link card. */
export async function fetchLinkPreview(id: string) {
  const node = useBoard.getState().nodes[id];
  if (node?.type !== 'link' || !node.url || inFlight.has(id)) return;
  inFlight.add(id);
  const { url } = node;
  const update = (patch: NodePatch) => {
    const current = useBoard.getState().nodes[id];
    if (current?.type === 'link' && current.url === url) useBoard.getState().updateNode(id, { ...patch, previewVersion: PREVIEW_VERSION });
  };
  update({ status: 'loading' });

  const video = youtubeId(url);
  // YouTube thumbnails can be built from the video id, so videos always get one.
  const fallback: Preview = {
    title: video ? 'YouTube video' : hostnameOf(url),
    description: '',
    image: video ? youtubeThumbnail(video) : '',
    icon: '',
    siteName: video ? 'YouTube' : hostnameOf(url),
  };
  try {
    let preview: Preview;
    try {
      preview = await fromOwnServer(url);
    } catch {
      preview = await fromMicrolink(url);
    }
    update({
      status: 'ready',
      title: preview.title || fallback.title,
      description: preview.description,
      image: preview.image || fallback.image,
      icon: preview.icon,
      siteName: preview.siteName || fallback.siteName,
    });
  } catch {
    update(video ? { ...fallback, status: 'ready' } : { status: 'error', title: fallback.title, siteName: fallback.siteName });
  } finally {
    inFlight.delete(id);
  }
}

export function addLinkAt(url: string, at: Point) {
  const s = useBoard.getState();
  s.setTool('select');
  const node = createLink(at.x - 140, at.y - 40, { url });
  s.addNode(node, { select: true });
  return node.id;
}
