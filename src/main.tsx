import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { App } from './App';
import { installTheme } from './lib/theme';
import './styles.css';

// Before the first render, so dark mode doesn't flash light on load.
installTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
