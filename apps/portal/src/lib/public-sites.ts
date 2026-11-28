// The public website, with the ready-to-wear shop inside it at /shop, is served by this same service.
// With NY_WEBSITE_ORIGIN set (for example https://thenyatelier.com) the website has its own address.
// Without it, it is a preview under /home (and /home/shop) on the service's own address. The two built
// apps are copied to public/_sites/website/ and public/_sites/store/ when the Render image is built.
// Only the named public API calls below are reachable through them.
type Environment = Record<string, string | undefined>;
export type PublicSite = 'website' | 'store';
export type SiteRoute = { kind: 'rewrite'; path: string } | { kind: 'block'; status: 404 | 405 };

function host(value: string | undefined): string | null {
  if (!value) return null;
  const url = new URL(value);
  const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost');
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.pathname !== '/' || url.search || url.hash || url.username) {
    throw new Error('Public site origins must be HTTPS addresses without a path.');
  }
  return url.host.toLowerCase();
}

/** Own address when configured; otherwise (or with NY_PUBLIC_SITES_PREVIEW_PATHS=1) the /home preview. */
export function sitesUseOwnAddresses(env: Environment = process.env): boolean {
  if (env.NY_PUBLIC_SITES_PREVIEW_PATHS === '1') return false;
  return Boolean(env.NY_WEBSITE_ORIGIN);
}

/** The shop is its own built app, living under /shop on the website. */
export function withinWebsite(pathname: string): { site: PublicSite; inner: string } {
  const shop = pathname === '/shop' || pathname.startsWith('/shop/');
  return shop ? { site: 'store', inner: pathname.slice('/shop'.length) || '/' } : { site: 'website', inner: pathname };
}

/** The preview site for a path like /home/shop/product/x, with the path inside that site. */
export function siteForPath(pathname: string): { site: PublicSite; inner: string } | null {
  if (pathname !== '/home' && !pathname.startsWith('/home/')) return null;
  return withinWebsite(pathname.slice('/home'.length) || '/');
}

/** The website (or its shop) for the website's own address. */
export function siteForHost(requestHost: string, pathname: string, env: Environment = process.env): { site: PublicSite; inner: string } | null {
  const name = requestHost.toLowerCase();
  return name && name === host(env.NY_WEBSITE_ORIGIN) ? withinWebsite(pathname) : null;
}

/** The public API calls each site makes, mapped to the portal's own public routes. */
// The shop shares the website's address, so both use the same list.
const apis: Record<string, { method: string; path: string }> = {
  '/api/shop/catalogue': { method: 'GET', path: '/api/public/shop/catalogue' },
  '/api/consultations': { method: 'POST', path: '/api/public/consultations' },
  '/api/size-charts': { method: 'GET', path: '/api/size-charts' },
};

export function siteRoute(site: PublicSite, pathname: string, method: string): SiteRoute {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    // Customer sign-in and account calls: the portal's /api/account route checks each one itself.
    if (pathname.startsWith('/api/account/') && ['GET', 'POST', 'PATCH'].includes(method)) return { kind: 'rewrite', path: pathname };
    // Appointment replies from the email link: /api/consultations/<id>/view or /reply.
    const reply = pathname.match(/^\/api\/consultations\/([\da-f-]{36})\/(view|reply)$/i);
    if (reply) return method === 'POST' ? { kind: 'rewrite', path: `/api/public/consultations/${reply[1]}/${reply[2]}` } : { kind: 'block', status: 405 };
    const api = apis[pathname];
    if (!api) return { kind: 'block', status: 404 };
    const allowed = method === api.method || (api.method === 'GET' && method === 'HEAD');
    return allowed ? { kind: 'rewrite', path: api.path } : { kind: 'block', status: 405 };
  }
  if (pathname.split('/').some(part => part === '..' || part.startsWith('.'))) return { kind: 'block', status: 404 };
  // Files (anything with an extension) come from the site's build; every other path is a page of the app.
  const file = /\.[a-z0-9]+$/i.test(pathname);
  return { kind: 'rewrite', path: `/_sites/${site}${file ? pathname : '/index.html'}` };
}
