import { useLayoutEffect, type RefObject } from 'react';
import { useBoard } from '../store/board';

/** Keep a node's stored height in sync with its rendered size, so lines attach to its edges. */
export function useMeasuredHeight(ref: RefObject<HTMLElement | null>, id: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = useBoard.getState();
      const node = s.nodes[id];
      if (node && node.height !== el.offsetHeight) s.updateNode(id, { height: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, id]);
}
