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

// The shop's dev server only answers under /shop/, so a bare /shop link gets the slash added.
const shopSlash = () => ({
  name: 'ny-shop-slash',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(/^\/shop(\?.*)?$/);
      if (!match) return next();
      res.statusCode = 302; res.setHeader('Location', `/shop/${match[1] ?? ''}`); res.end();
    });
  },
});

export default defineConfig({
  base,
  plugins: [react(), prefixPublicPaths(), shopSlash()],
  // The shop is its own app (codebase/rtw-store) served inside the website at /shop; locally its dev server
  // (5174) is passed through here, so open http://localhost:5173/shop. Size charts come from the portal.
  server: { host: '0.0.0.0', port: 5173, proxy: { '/shop': { target: 'http://localhost:5174', ws: true }, '/api/size-charts': 'http://localhost:3000', '/api/account': 'http://localhost:3000', '/api': 'http://localhost:8000' } },
  preview: { host: '0.0.0.0', port: 4173 },
});
