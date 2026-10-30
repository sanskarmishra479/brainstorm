import { useBoard } from '../store/board';
import { useUI } from '../store/ui';
import { expandWithContents, isGroup } from './nodes';

const H_GAP = 90;
const V_GAP = 28;
const TREE_GAP = 64;

/**
 * Arrange connected nodes as left-to-right trees. Works on the selection when
 * two or more nodes are selected, otherwise on the whole board. Nodes without
 * connections and groups are left where they are. Returns false if there was
 * nothing to arrange.
 */
export function tidyLayout(): boolean {
  const s = useBoard.getState();
  const scope = s.selectedIds.length >= 2 ? new Set(expandWithContents(s.nodes, s.selectedIds)) : null;
  const nodes = Object.values(s.nodes).filter((n) => !isGroup(n) && (!scope || scope.has(n.id)));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = Object.values(s.edges).filter((e) => ids.has(e.from) && ids.has(e.to));
  if (edges.length === 0) return false;

  const out = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const e of edges) {
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
    incoming.add(e.to);
  }
  const byPosition = (a: string, b: string) => s.nodes[a].y - s.nodes[b].y || s.nodes[a].x - s.nodes[b].x;
  const connected = [...new Set(edges.flatMap((e) => [e.from, e.to]))].sort(byPosition);

  // Spanning trees: each node is placed under the first parent that reaches it.
  const children = new Map<string, string[]>();
  const placed = new Set<string>();
  const roots: string[] = [];
  const grow = (root: string) => {
    roots.push(root);
    placed.add(root);
    const queue = [root];
    while (queue.length) {
      const id = queue.shift()!;
      const kids = (out.get(id) ?? []).filter((k) => !placed.has(k)).sort(byPosition);
      kids.forEach((k) => placed.add(k));
      children.set(id, kids);
      queue.push(...kids);
    }
  };
  connected.filter((id) => !incoming.has(id)).forEach(grow);
  // Whatever is left sits on a cycle with no clear root.
  connected.filter((id) => !placed.has(id)).forEach((id) => !placed.has(id) && grow(id));

  const height = (id: string) => Math.max(s.nodes[id].height, 40);
  const subtree = new Map<string, number>();
  const measure = (id: string): number => {
    const kids = children.get(id) ?? [];
    const kidsHeight = kids.reduce((sum, k) => sum + measure(k), 0) + V_GAP * Math.max(0, kids.length - 1);
    const h = Math.max(height(id), kidsHeight);
    subtree.set(id, h);
    return h;
  };

  const targets: Record<string, { x: number; y: number }> = {};
  const anchor = s.nodes[roots[0]];
  let top = anchor.y;
  for (const root of roots) {
    measure(root);
    // Column x positions for this tree, based on the widest node at each depth.
    const widths: number[] = [];
    const collect = (id: string, depth: number) => {
      widths[depth] = Math.max(widths[depth] ?? 0, s.nodes[id].width);
      (children.get(id) ?? []).forEach((k) => collect(k, depth + 1));
    };
    collect(root, 0);
    const columns = widths.reduce<number[]>((xs, _w, d) => [...xs, d === 0 ? anchor.x : xs[d - 1] + widths[d - 1] + H_GAP], []);

    const place = (id: string, depth: number, y: number) => {
      const total = subtree.get(id)!;
      targets[id] = { x: columns[depth], y: y + (total - height(id)) / 2 };
      const kids = children.get(id) ?? [];
      const kidsHeight = kids.reduce((sum, k) => sum + subtree.get(k)!, 0) + V_GAP * Math.max(0, kids.length - 1);
      let cursor = y + (total - kidsHeight) / 2;
      for (const k of kids) {
        place(k, depth + 1, cursor);
        cursor += subtree.get(k)! + V_GAP;
      }
    };
    place(root, 0, top);
    top += subtree.get(root)! + TREE_GAP;
  }

  animateNodes(targets);
  return true;
}

/** Move nodes to new positions with a short ease, as a single undo step. */
export function animateNodes(targets: Record<string, { x: number; y: number }>, duration = 360) {
  const s = useBoard.getState();
  s.checkpoint();
  const from = Object.fromEntries(Object.keys(targets).map((id) => [id, { x: s.nodes[id].x, y: s.nodes[id].y }]));
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 3);
    useBoard.getState().setPositions(
      Object.fromEntries(
        Object.entries(targets).map(([id, to]) => [id, { x: from[id].x + (to.x - from[id].x) * e, y: from[id].y + (to.y - from[id].y) * e }]),
      ),
    );
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Tidy up, explaining when there's nothing it can arrange. */
export function tidyUp() {
  if (!tidyLayout()) useUI.getState().toast('Tidy up arranges connected cards — connect some first.');
}
