import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Size charts come from NY Office (the portal); everything else from the Laravel API.
// The store runs beside the main website (5173) so the two can link to each other locally.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5174, strictPort: true, proxy: { '/api/size-charts': 'http://localhost:3000', '/api': 'http://localhost:8000' } },
  preview: { host: '0.0.0.0', port: 4174 },
});
