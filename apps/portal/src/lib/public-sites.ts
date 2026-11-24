// The public website and RTW store are served by this same service on their own addresses,
// like NY Studio and NY Office: NY_WEBSITE_ORIGIN (for example https://home.thenyatelier.com)
// and NY_STORE_ORIGIN (https://store.thenyatelier.com). Their built files are copied to
// public/_sites/<site>/ when the Render image is built. Nothing else in the portal is reachable
// on those addresses: only the named public API calls below.
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

export function siteForHost(requestHost: string, env: Environment = process.env): PublicSite | null {
  const name = requestHost.toLowerCase();
  if (name && name === host(env.NY_WEBSITE_ORIGIN)) return 'website';
  if (name && name === host(env.NY_STORE_ORIGIN)) return 'store';
  return null;
}

/** The public API calls each site makes, mapped to the portal's own public routes. */
const apis: Record<PublicSite, Record<string, { method: string; path: string }>> = {
  website: {
    '/api/shop/catalogue': { method: 'GET', path: '/api/public/shop/catalogue' },
    '/api/consultations': { method: 'POST', path: '/api/public/consultations' },
  },
  store: {
    '/api/shop/catalogue': { method: 'GET', path: '/api/public/shop/catalogue' },
    '/api/size-charts': { method: 'GET', path: '/api/size-charts' },
  },
};

export function siteRoute(site: PublicSite, pathname: string, method: string): SiteRoute {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const api = apis[site][pathname];
    if (!api) return { kind: 'block', status: 404 };
    const allowed = method === api.method || (api.method === 'GET' && method === 'HEAD');
    return allowed ? { kind: 'rewrite', path: api.path } : { kind: 'block', status: 405 };
  }
  if (pathname.split('/').some(part => part === '..' || part.startsWith('.'))) return { kind: 'block', status: 404 };
  // Files (anything with an extension) come from the site's build; every other path is a page of the app.
  const file = /\.[a-z0-9]+$/i.test(pathname);
  return { kind: 'rewrite', path: `/_sites/${site}${file ? pathname : '/index.html'}` };
}
