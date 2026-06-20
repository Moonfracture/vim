import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build straight into ../site so `openkbs site deploy` ships the compiled app.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../site',
    emptyOutDir: true,
  },
});
