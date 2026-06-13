import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const packageDir = fileURLToPath(new URL('.', import.meta.url));
const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@arco-design/web-react',
  /^@arco-design\/web-react\//,
];

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(packageDir, 'src/index.ts'),
        styles: resolve(packageDir, 'src/styles-entry.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external,
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'styles.css' : 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: true,
      bundledPackages: [
        '@novacanvas/sdk',
        '@novacanvas/types',
        '@novacanvas/biz-config',
        '@tanstack/react-query',
        'zustand',
        'lucide-react',
      ],
      exclude: ['**/*.test.*', '**/*.spec.*'],
    }),
  ],
});
