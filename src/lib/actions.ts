import { useBoard } from '../store/board';
import { placementPoint, worldCenter } from './camera';
import { intersects } from './geometry';
import { textToDoc } from './richtext';
import { CARD_WIDTH, createCard, createGroup, createText, isGroup, TEXT_WIDTH } from './nodes';

/**
 * Top-left position for a w×h node as close to (cx, cy) as possible without
 * overlapping existing content, searching outward in rings.
 */
function freeSpot(cx: number, cy: number, w: number, h: number) {
  const others = Object.values(useBoard.getState().nodes)
    .filter((n) => !isGroup(n))
    .map((n) => ({ x: n.x - 16, y: n.y - 16, width: n.width + 32, height: Math.max(n.height, 40) + 32 }));
  const fits = (x: number, y: number) => !others.some((r) => intersects(r, { x, y, width: w, height: h }));
  for (let ring = 0; ring < 30; ring++) {
    const steps = Math.max(1, ring * 8);
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = cx - w / 2 + Math.cos(angle) * ring * 40;
      const y = cy - h / 2 + Math.sin(angle) * ring * 30;
      if (fits(x, y)) return { x, y };
    }
  }
  return { x: cx - w / 2, y: cy - h / 2 };
}

export function addCardAt(x: number, y: number) {
  const s = useBoard.getState();
  s.setTool('select');
  return s.addNode(createCard(x - CARD_WIDTH / 2, y - 24), { edit: true });
}

export function addCardAtCenter() {
  const c = worldCenter();
  const p = freeSpot(c.x, c.y, CARD_WIDTH, 60);
  return addCardAt(p.x + CARD_WIDTH / 2, p.y + 24);
}

export function addTextAtCenter() {
  const c = worldCenter();
  const p = freeSpot(c.x, c.y, TEXT_WIDTH, 40);
  const s = useBoard.getState();
  s.setTool('select');
  return s.addNode(createText(p.x, p.y), { edit: true });
}

/** Wrap the selection in a group, or drop an empty group in view. */
export function addGroup() {
  const s = useBoard.getState();
  s.setTool('select');
  if (s.selectedIds.length > 0) return s.groupSelection();
  const c = worldCenter();
  return s.addNode(createGroup(c.x - 240, c.y - 160, 480, 320), { select: true });
}

/** Turn pasted plain text into a card: first line as title, the rest as body. */
export function addCardFromText(text: string) {
  const [first, ...rest] = text.trim().split('\n');
  const p = placementPoint();
  const s = useBoard.getState();
  s.setTool('select');
  return s.addNode(createCard(p.x - CARD_WIDTH / 2, p.y - 24, { title: first.slice(0, 200), body: textToDoc(rest.join('\n').trim()) }), {
    select: true,
  });
}
