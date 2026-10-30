import { generateHTML } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import StarterKit from '@tiptap/starter-kit';
import type { RichDoc } from '../types';

/** The schema shared by the card editor and the read-only renderer. */
export const richExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

const paragraph = (text: string) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });

/** Plain text (one paragraph per line) to a document; empty text gives null. */
export function textToDoc(text: string): RichDoc | null {
  if (!text.trim()) return null;
  return { type: 'doc', content: text.split('\n').map(paragraph) };
}

const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'blockquote']);

export function docToText(doc: RichDoc | null): string {
  if (!doc) return '';
  const lines: string[] = [];
  const walk = (node: RichDoc, line: string[]): void => {
    if (node.type === 'text') {
      line.push(node.text ?? '');
      return;
    }
    if (node.type === 'hardBreak') {
      line.push('\n');
      return;
    }
    if (BLOCKS.has(node.type ?? '') && !(node.content ?? []).some((c) => BLOCKS.has(c.type ?? ''))) {
      const own: string[] = [];
      node.content?.forEach((c) => walk(c, own));
      lines.push(own.join(''));
      return;
    }
    node.content?.forEach((c) => walk(c, line));
  };
  walk(doc, []);
  return lines.join('\n').trim();
}

const htmlCache = new WeakMap<RichDoc, string>();

/** Render a document to HTML through the schema, so only known nodes and marks come out. */
export function renderDoc(doc: RichDoc): string {
  let html = htmlCache.get(doc);
  if (html === undefined) {
    try {
      html = generateHTML(doc, richExtensions);
    } catch {
      html = '';
    }
    htmlCache.set(doc, html);
  }
  return html;
}

/** Accept a stored body: strings from older saves become paragraphs; unrenderable docs are dropped. */
export function normalizeDoc(raw: unknown): RichDoc | null {
  if (typeof raw === 'string') return textToDoc(raw);
  if (!raw || typeof raw !== 'object' || (raw as RichDoc).type !== 'doc') return null;
  try {
    generateHTML(raw as RichDoc, richExtensions);
    return raw as RichDoc;
  } catch {
    return null;
  }
}

/** Flip the checkbox of the nth task item (in document order). */
export function toggleTask(doc: RichDoc, index: number): RichDoc {
  let seen = -1;
  const visit = (node: RichDoc): RichDoc => {
    let next = node;
    if (node.type === 'taskItem' && ++seen === index) {
      next = { ...node, attrs: { ...node.attrs, checked: !node.attrs?.checked } };
    }
    return next.content ? { ...next, content: next.content.map(visit) } : next;
  };
  return visit(doc);
}

export const docHasList = (doc: RichDoc | null) =>
  !!doc?.content?.some((n) => n.type === 'bulletList' || n.type === 'orderedList' || n.type === 'taskList');
