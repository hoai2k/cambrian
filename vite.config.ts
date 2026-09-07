import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      // Four pages: the Cambrian game at /, Devonian Domination at /devonian/, the specimen viewer at
      // /viewer/, the dev benches at /workbench/.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        devonian: fileURLToPath(new URL('./devonian/index.html', import.meta.url)),
        viewer: fileURLToPath(new URL('./viewer/index.html', import.meta.url)),
        workbench: fileURLToPath(new URL('./workbench/index.html', import.meta.url)),
      },
    },
  },
});
