import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The store runs beside the main website (5173) so the two can link to each other locally.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5174, strictPort: true, proxy: { '/api': 'http://localhost:8000' } },
  preview: { host: '0.0.0.0', port: 4174 },
});
