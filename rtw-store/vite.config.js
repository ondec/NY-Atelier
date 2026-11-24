import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NY_SITE_BASE (for example /home/) builds the site to run under a path on the shared Render
// preview address. Vite prefixes its own files; this also prefixes the public folder paths
// written in the source ('/images/…', '/products/…'), which Vite leaves alone.
const base = process.env.NY_SITE_BASE || '/';
const publicPaths = /(['"`(])\/(images|videos|products|fonts|ny-[a-z]+\.svg)(?=[/'"`)]|$)/g;
const prefixPublicPaths = () => ({
  name: 'ny-prefix-public-paths',
  transform(code, id) {
    if (base === '/' || !/\/src\/.*\.(jsx?|css)$/.test(id)) return null;
    return { code: code.replace(publicPaths, (_, quote, folder) => `${quote}${base}${folder}`), map: null };
  },
});

// Size charts come from NY Office (the portal); everything else from the Laravel API.
// The store runs beside the main website (5173) so the two can link to each other locally.
export default defineConfig({
  base,
  plugins: [react(), prefixPublicPaths()],
  server: { host: '0.0.0.0', port: 5174, strictPort: true, proxy: { '/api/size-charts': 'http://localhost:3000', '/api': 'http://localhost:8000' } },
  preview: { host: '0.0.0.0', port: 4174 },
});
