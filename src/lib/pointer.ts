let cancelActive: (() => void) | null = null;

/**
 * Follow a pointer drag at window level until it is released.
 * Only one drag runs at a time; `cancelActiveDrag` stops it (e.g. when a pinch starts).
 */
export function trackPointer(onMove: (e: PointerEvent) => void, onUp?: (e: PointerEvent) => void) {
  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    cancelActive = null;
  };
  const up = (e: PointerEvent) => {
    cleanup();
    onUp?.(e);
  };
  cancelActive?.();
  cancelActive = cleanup;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

export function cancelActiveDrag() {
  cancelActive?.();
}

export const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest('input, textarea, [contenteditable="true"]');

let lastTap = { time: 0, x: 0, y: 0, key: '' };

/** Detect a second touch tap on the same target, since touch screens have no reliable dblclick. */
export function isDoubleTap(e: { pointerType: string; clientX: number; clientY: number }, key: string) {
  if (e.pointerType !== 'touch') return false;
  const now = performance.now();
  const double = now - lastTap.time < 320 && lastTap.key === key && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24;
  lastTap = double ? { time: 0, x: 0, y: 0, key: '' } : { time: now, x: e.clientX, y: e.clientY, key };
  return double;
}
