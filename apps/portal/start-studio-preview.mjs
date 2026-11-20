import http from 'node:http';
const port = Number(process.env.STUDIO_PREVIEW_PORT ?? 3004);
const target = new URL(process.env.STUDIO_PORTAL_ORIGIN ?? 'http://127.0.0.1:3000');
function allowed(value) {
  const url = new URL(value, 'http://studio.local');
  const pathname = url.pathname;
  if (pathname === '/') return true;
  if (['/showroom', '/studio.webmanifest', '/studio-sw.js', '/studio-offline.html', '/office.webmanifest', '/api/owner-overview', '/staff-sw.js', '/staff-offline.html', '/ny-mark.svg', '/licenses/lets-icons-CC-BY-4.0.txt'].includes(pathname)) return true;
  if (['/office/', '/staff/', '/api/staff-auth/', '/api/staff-', '/api/consultations', '/api/size-charts', '/showroom/', '/api/studio/', '/studio-assets/', '/catalogue/', '/collections/', '/fonts/', '/_next/static/', '/_next/webpack-hmr'].some(prefix => pathname.startsWith(prefix))) return true;
  if (pathname === '/_next/image') { const src = url.searchParams.get('url') ?? ''; return /^\/(catalogue|collections|showroom|studio-assets)\//.test(src) || src === '/ny-mark.svg'; }
  return false;
}
const server = http.createServer((request, response) => {
  if (!allowed(request.url ?? '/')) { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('This address is only for NY Studio.'); return; }
  const originalHost = request.headers.host;
  const headers = { ...request.headers, host: target.host, 'x-forwarded-host': originalHost, 'x-ny-studio-preview': '1' };
  delete headers['forwarded'];
  const proxy = http.request(new URL(request.url, target), { method: request.method, headers }, upstream => {
    response.writeHead(upstream.statusCode ?? 502, { ...upstream.headers, 'Cache-Control': request.url.startsWith('/api/') || request.url.startsWith('/showroom') ? 'no-store' : upstream.headers['cache-control'] ?? 'public, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow' });
    upstream.pipe(response);
  });
  proxy.on('error', () => { if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'text/plain' }); response.end('NY Studio is starting. Try again shortly.'); });
  request.pipe(proxy);
});
server.on('upgrade', (request, socket, head) => {
  if (!request.url?.startsWith('/_next/webpack-hmr')) { socket.destroy(); return; }
  const proxy = http.request(new URL(request.url, target), { headers: { ...request.headers, host: target.host } });
  proxy.on('upgrade', (upstream, connection, data) => { socket.write(`HTTP/1.1 ${upstream.statusCode} Switching Protocols\r\n${Object.entries(upstream.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`); if (head.length) connection.write(head); if (data.length) socket.write(data); socket.pipe(connection).pipe(socket); });
  proxy.on('error', () => socket.destroy()); proxy.end();
});
server.listen(port, '127.0.0.1', () => console.log(`NY Studio preview: http://127.0.0.1:${port}/showroom`));
