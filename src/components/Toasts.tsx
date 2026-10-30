import { useUI } from '../store/ui';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => useUI.getState().dismissToast(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
