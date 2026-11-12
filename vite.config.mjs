import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'frontend',
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../client',
    emptyOutDir: false,
    assetsDir: 'dist-assets',
    rollupOptions: {
      input: 'frontend/index.html'
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3333',
      '/socket.io': {
        target: 'http://localhost:3333',
        ws: true
      }
    }
  }
});

