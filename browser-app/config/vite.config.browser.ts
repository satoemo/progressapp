import { defineConfig } from 'vite';
import path from 'path';
import { Plugin } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, '../src/main-browser.ts'),
      name: 'KintoneProgressApp',
      fileName: 'kintone-progress-app',
      formats: ['iife']
    },
    outDir: path.resolve(__dirname, '../dist/browser'),
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
        // pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_proto: true,
        unsafe_regexp: true
      },
      mangle: {
        properties: false
      },
      format: {
        comments: false
      }
    }
  },
  server: {
    port: 5173,
    open: 'test-browser.html'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});