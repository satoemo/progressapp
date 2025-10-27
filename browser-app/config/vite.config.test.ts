import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@test': path.resolve(__dirname, '../test')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../test/dist'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, '../src/main-browser.ts'),
      name: 'KintoneProgressAppTest',
      fileName: 'kintone-progress-app.test',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return assetInfo.name;
        }
      }
    },
    sourcemap: true,
    minify: false // テスト用なので圧縮しない
  }
});