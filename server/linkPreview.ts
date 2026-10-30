import { lookup } from 'node:dns/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import type { Plugin } from 'vite';
import { youtubeId, youtubeThumbnail } from '../src/lib/youtube';

/**
 * GET /api/link-preview?url=… → { title, description, image, icon, siteName }
 *
 * Browsers can't read other sites' HTML (CORS), so link cards ask this endpoint,
 * which runs inside the Vite dev/preview server, to fetch the page and read its
 * Open Graph tags. YouTube links use YouTube's oEmbed API instead.
 */

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  icon: string;
  siteName: string;
}

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const CACHE_MS = 60 * 60 * 1000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BrainstormLinkPreview/1.0; +https://localhost)';

// ---------- Only fetch public internet addresses ----------

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

/** Refuse anything that isn't http(s) to a public host, so the endpoint can't be used to probe the local network. */
async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https links are supported.');
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) throw new Error('That address is not allowed.');
}

/** Fetch with manual redirects (each hop re-checked) and a size cap. Returns the HTML head and final URL. */
async function fetchHtml(start: string): Promise<{ html: string; url: string }> {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en' },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new Error(`The page answered ${res.status}.`);
    if (!/html/i.test(res.headers.get('content-type') ?? '')) return { html: '', url: url.href };

    // Metadata lives in <head>; stop reading once it's done or the cap is hit.
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    return { html, url: url.href };
  }
  throw new Error('Too many redirects.');
}

// ---------- Parse Open Graph / Twitter / HTML metadata ----------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (s: string) =>
  s
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .trim();

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? '') : '';
}

const absolute = (value: string, base: string) => {
  if (!value) return '';
  try {
    const u = new URL(value, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
};

function parseHtml(html: string, url: string): LinkPreview {
  const meta = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    const content = attr(tag, 'content');
    if (key && content && !meta.has(key)) meta.set(key, content);
  }
  const pick = (...keys: string[]) => keys.map((k) => meta.get(k)).find(Boolean) ?? '';

  const icons = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({ rel: attr(tag, 'rel').toLowerCase(), href: attr(tag, 'href') }))
    .filter((l) => l.href && /\bicon\b/.test(l.rel));
  const icon = icons.find((l) => l.rel.includes('apple-touch-icon')) ?? icons[0];

  // Pages without a share image (course or playlist pages, say) often link to videos:
  // the first one's thumbnail is a better picture than none.
  const video = html.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  const image = pick('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src');

  const host = new URL(url).hostname.replace(/^www\./, '');
  return {
    title: pick('og:title', 'twitter:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '') || host,
    description: pick('og:description', 'twitter:description', 'description'),
    image: absolute(image, url) || (video ? youtubeThumbnail(video) : ''),
    icon: absolute(icon?.href ?? '/favicon.ico', url),
    siteName: pick('og:site_name', 'application-name') || host,
  };
}

async function youtubePreview(url: string, id: string): Promise<LinkPreview> {
  const base = { image: youtubeThumbnail(id), icon: 'https://www.youtube.com/favicon.ico', siteName: 'YouTube' };
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { ...base, title: data.title ?? 'YouTube video', description: data.author_name ? `Video by ${data.author_name}` : '' };
  } catch {
    return { ...base, title: 'YouTube video', description: '' };
  }
}

// ---------- Endpoint ----------

const cache = new Map<string, { at: number; value: LinkPreview }>();

async function preview(target: string): Promise<LinkPreview> {
  const hit = cache.get(target);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const id = youtubeId(target);
  let value: LinkPreview;
  if (id) {
    value = await youtubePreview(target, id);
  } else {
    const { html, url } = await fetchHtml(target);
    value = parseHtml(html, url);
  }
  cache.set(target, { at: Date.now(), value });
  return value;
}

async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (!req.url?.startsWith('/api/link-preview')) return next();
  const target = new URL(req.url, 'http://localhost').searchParams.get('url') ?? '';
  res.setHeader('content-type', 'application/json');
  try {
    const value = await preview(new URL(target).href);
    res.setHeader('cache-control', 'private, max-age=3600');
    res.end(JSON.stringify(value));
  } catch (err) {
    res.statusCode = 422;
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Preview failed' }));
  }
}

export function linkPreviewPlugin(): Plugin {
  return {
    name: 'brainstorm-link-preview',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  };
}
