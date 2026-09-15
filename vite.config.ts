import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const BACKEND = 'http://54.86.109.228:9600';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 6145,
    proxy: {
      '/api':     { target: BACKEND, changeOrigin: true },
      '/onboard': { target: BACKEND, changeOrigin: true },
      '/sdk':     { target: BACKEND, changeOrigin: true },
      '/health':  { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    port: 9601,
    host: '0.0.0.0',
  },
});
