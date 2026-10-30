import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { linkPreviewPlugin } from './server/linkPreview';

export default defineConfig({
  plugins: [react(), linkPreviewPlugin()],
});
