import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for ENCRYPTO
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

