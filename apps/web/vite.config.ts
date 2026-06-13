import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@novacanvas/react': fileURLToPath(
        new URL('../../packages/react/src/index.ts', import.meta.url),
      ),
      '@novacanvas/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
      '@novacanvas/types': fileURLToPath(
        new URL('../../packages/types/src/index.ts', import.meta.url),
      ),
      '@novacanvas/biz-config': fileURLToPath(
        new URL('../../packages/biz-config/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5300,
    strictPort: true,
  },
});
