import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'main.js'
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: 'src/preload.js'
      }
    }
  },
  renderer: {
    root: '.', 
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    plugins: [react()]
  }
});
