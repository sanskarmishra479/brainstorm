import type { BoardNode, Edge, RichDoc } from '../types';
import { PREVIEW_VERSION } from './media';
import { createCard, createGroup, createImage, createLink, createText, uid } from './nodes';
import { youtubeThumbnail } from './youtube';

/**
 * The starter board: a "Learn AI faster" roadmap that also shows off every
 * node type (text, cards with rich text, checklists, groups, images, links,
 * labelled connections).
 */

// ---------- Tiny rich-text builders (**bold** is supported inline) ----------

function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] } : { type: 'text', text: part },
    );
}

const p = (text: string): RichDoc => ({ type: 'paragraph', content: inline(text) });
const bullets = (items: string[]): RichDoc => ({
  type: 'bulletList',
  content: items.map((t) => ({ type: 'listItem', content: [p(t)] })),
});
const numbered = (items: string[]): RichDoc => ({
  type: 'orderedList',
  content: items.map((t) => ({ type: 'listItem', content: [p(t)] })),
});
const tasks = (items: [string, boolean][]): RichDoc => ({
  type: 'taskList',
  content: items.map(([t, checked]) => ({ type: 'taskItem', attrs: { checked }, content: [p(t)] })),
});
const doc = (...content: RichDoc[]): RichDoc => ({ type: 'doc', content });

// ---------- Illustration: a small neural network, as an inline SVG ----------

function networkSvg() {
  const layers = [
    [60, 120, 180],
    [40, 95, 145, 200],
    [40, 95, 145, 200],
    [90, 150],
  ];
  const xs = [55, 135, 215, 295];
  const colors = ['#6ea8ef', '#b18cf0', '#b18cf0', '#7cc98d'];
  let lines = '';
  for (let l = 0; l < layers.length - 1; l++)
    for (const y1 of layers[l])
      for (const y2 of layers[l + 1])
        lines += `<line x1="${xs[l]}" y1="${y1}" x2="${xs[l + 1]}" y2="${y2}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>`;
  const nodes = layers
    .map((ys, l) => ys.map((y) => `<circle cx="${xs[l]}" cy="${y}" r="13" fill="${colors[l]}" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>`).join(''))
    .join('');
  const labels = ['input', 'hidden', 'hidden', 'output']
    .map((t, l) => `<text x="${xs[l]}" y="232" fill="#ffffff" fill-opacity="0.55" font-family="sans-serif" font-size="11" text-anchor="middle">${t}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="245" viewBox="0 0 350 245"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e2140"/><stop offset="1" stop-color="#2a1d3d"/></linearGradient></defs><rect width="350" height="245" fill="url(#g)"/>${lines}${nodes}${labels}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------- The board ----------

export function learnAiBoard(): { nodes: Record<string, BoardNode>; edges: Record<string, Edge> } {
  const W = 240;
  const GROUP_W = 300;
  const STRIDE = 400;
  const groupX = (i: number) => i * STRIDE;
  const inner = (i: number) => groupX(i) + (GROUP_W - W) / 2;

  const title = createText(0, -210, { text: 'Learn AI faster', size: 'xl', color: 'purple', width: 560 });
  const subtitle = createText(0, -140, {
    text: 'A 12-week roadmap from zero to shipping your first AI app. Follow it left to right — tick things off as you go.',
    size: 's',
    width: 620,
  });

  const picture = createImage(-440, 0, { src: networkSvg(), aspect: 245 / 350, width: 340, caption: 'What you’re building towards: data in → layers learn patterns → prediction out' });
  const start = createCard(-390, 330, {
    title: '👋 Start here',
    width: 240,
    body: doc(
      p('Don’t try to learn everything. Learn **just enough**, then **build something**.'),
      p('Each column is one stage. Finish its checklist before moving right.'),
    ),
  });

  // Stage 1 — Foundations
  const g1 = createGroup(groupX(0), 0, GROUP_W, 600, { title: 'Week 1–2 · Foundations', color: 'blue' });
  const foundations = createCard(inner(0), 64, {
    title: 'Python & just-enough math',
    color: 'blue',
    width: W,
    body: doc(
      bullets([
        '**Python**: functions, lists, dicts, NumPy, pandas',
        '**Linear algebra**: vectors, matrices, dot product',
        '**Probability**: mean, variance, distributions',
        '**Calculus**: what a gradient means — no proofs',
      ]),
    ),
  });
  const vocab = createLink(inner(0), 300, {
    url: 'https://www.sanskar.works/blog/ai-terms-before-becoming-an-ai-engineer',
    title: '20 AI Terms Explained Simply for Beginners',
    description: 'The 20 AI terms I wish someone explained to me simply: LLMs, tokens, inference, RAG, agents, context engineering and more, in plain English.',
    image: 'https://cdn.sanity.io/images/kb1e3hx1/production/abbcada18ae06693052c6b087f0ec60763d2ca9f-1450x1085.png?rect=0,163,1450,761&w=1200&h=630&fit=crop&auto=format',
    siteName: 'Sanskar Mishra',
    status: 'ready',
    previewVersion: PREVIEW_VERSION,
    width: W,
  });

  // Stage 2 — Machine learning
  const g2 = createGroup(groupX(1), 0, GROUP_W, 600, { title: 'Week 3–5 · Machine learning', color: 'green' });
  const ml = createCard(inner(1), 64, {
    title: 'Core ML ideas',
    color: 'green',
    width: W,
    body: doc(
      bullets([
        'Supervised vs unsupervised learning',
        'Train / validation / test splits',
        '**Overfitting** and how to spot it',
        'Linear & logistic regression, decision trees',
        'Metrics: accuracy, precision, recall',
      ]),
    ),
  });
  const mlPractice = createCard(inner(1), 330, {
    title: 'Practice',
    width: W,
    body: doc(tasks([
      ['Predict house prices with scikit-learn', false],
      ['Kaggle: Titanic survival', false],
      ['Build a spam classifier', false],
    ])),
  });

  // Stage 3 — Deep learning
  const g3 = createGroup(groupX(2), 0, GROUP_W, 600, { title: 'Week 6–8 · Deep learning', color: 'purple' });
  const dl = createCard(inner(2), 64, {
    title: 'Neural networks',
    color: 'purple',
    width: W,
    body: doc(
      bullets([
        'Neurons, layers, activations',
        '**Backpropagation** + gradient descent',
        'PyTorch basics: tensors, training loop',
        'CNNs for images',
        '**Transformers** & attention — the core of LLMs',
      ]),
    ),
  });
  const course = createLink(inner(2), 330, {
    url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
    title: 'Let’s build GPT: from scratch, in code, spelled out.',
    description: 'Video by Andrej Karpathy',
    image: youtubeThumbnail('kCc8FmEb1nY'),
    icon: 'https://www.youtube.com/favicon.ico',
    siteName: 'YouTube',
    status: 'ready',
    previewVersion: PREVIEW_VERSION,
    width: W,
  });

  // Stage 4 — Build with LLMs
  const g4 = createGroup(groupX(3), 0, GROUP_W, 600, { title: 'Week 9–12 · Build with LLMs', color: 'yellow' });
  const llm = createCard(inner(3), 64, {
    title: 'LLM engineering',
    color: 'yellow',
    width: W,
    body: doc(
      bullets([
        'Prompting & structured output',
        '**Embeddings** + vector search',
        '**RAG**: answer from your own documents',
        'Tool use & agents',
        'Evals: measure before you tweak',
      ]),
    ),
  });
  const ship = createCard(inner(3), 330, {
    title: '🚀 Ship one real project',
    color: 'red',
    width: W,
    body: doc(
      p('Pick one and put it online:'),
      tasks([
        ['Chat with your PDFs (RAG)', false],
        ['AI study buddy that quizzes you', false],
        ['Agent that summarises your inbox', false],
      ]),
    ),
  });

  const tips = createCard(groupX(1), 660, {
    title: 'How to learn faster',
    color: 'pink',
    width: 300,
    body: doc(
      numbered([
        '**Build first**, read theory when you get stuck',
        'Use the 80/20 rule — skip rare edge cases',
        'Explain each concept in one sentence (Feynman)',
        'Review notes after 1, 3 and 7 days',
        'Share what you build — feedback is fuel',
      ]),
    ),
  });
  const note = createText(groupX(2) + 20, 680, {
    text: 'Stuck? Go back one column — not forward.',
    size: 'm',
    color: 'green',
    width: 360,
  });

  const nodes = [g1, g2, g3, g4, title, subtitle, picture, start, foundations, vocab, ml, mlPractice, dl, course, llm, ship, tips, note];
  const edge = (from: BoardNode, to: BoardNode, label = ''): Edge => ({ id: uid(), from: from.id, to: to.id, label });
  const edges = [
    edge(start, foundations, 'begin'),
    edge(foundations, ml, 'next'),
    edge(ml, dl, 'next'),
    edge(dl, llm, 'next'),
    edge(ml, mlPractice, 'practice'),
    edge(llm, ship, 'apply it'),
  ];

  return {
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    edges: Object.fromEntries(edges.map((e) => [e.id, e])),
  };
}
