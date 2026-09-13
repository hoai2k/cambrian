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
      // Seven pages: the trilogy's own page at /, the three games at /cambrian/, /devonian/ and
      // /triassic/, the specimen viewer at /viewer/, the dev benches at /workbench/, and the
      // visitor stats at /stats/. (The address the trilogy page was first published at,
      // /ancientseas/, is a redirect in public/.)
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cambrian: fileURLToPath(new URL('./cambrian/index.html', import.meta.url)),
        devonian: fileURLToPath(new URL('./devonian/index.html', import.meta.url)),
        triassic: fileURLToPath(new URL('./triassic/index.html', import.meta.url)),
        viewer: fileURLToPath(new URL('./viewer/index.html', import.meta.url)),
        workbench: fileURLToPath(new URL('./workbench/index.html', import.meta.url)),
        stats: fileURLToPath(new URL('./stats/index.html', import.meta.url)),
      },
    },
  },
});
