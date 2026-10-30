import { useUI, type Theme } from '../store/ui';

const media = window.matchMedia('(prefers-color-scheme: dark)');

const resolve = (theme: Theme) => (theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);

function apply() {
  document.documentElement.dataset.theme = resolve(useUI.getState().theme);
}

/** Keep `<html data-theme>` in sync with the chosen theme and, for "system", the OS setting. */
export function installTheme() {
  apply();
  const unsubscribe = useUI.subscribe((s, prev) => s.theme !== prev.theme && apply());
  media.addEventListener('change', apply);
  return () => {
    unsubscribe();
    media.removeEventListener('change', apply);
  };
}

const ORDER: Theme[] = ['system', 'light', 'dark'];

export function cycleTheme() {
  const { theme, setPref } = useUI.getState();
  setPref('theme', ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);
}
