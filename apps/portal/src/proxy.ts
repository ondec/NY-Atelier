import { NextResponse, type NextRequest } from 'next/server';
import { siteForHost, siteForPath, siteRoute, sitesUseOwnAddresses } from '@/lib/public-sites';
import { publicHost } from '@/lib/workspace-hosts';

/** Serves the public website and its /shop (own address, or the /home preview); everything else passes through. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ownAddresses = sitesUseOwnAddresses();
  const byHost = ownAddresses ? siteForHost(publicHost(request.headers), pathname) : null;
  const byPath = ownAddresses ? null : siteForPath(pathname);
  if (!byHost && !byPath) {
    // The built files are reachable only through the sites themselves.
    return pathname.startsWith('/_sites/') ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }
  const site = (byHost ?? byPath)!;
  const route = siteRoute(site.site, site.inner, request.method);
  const response = route.kind === 'block'
    ? Response.json({ message: route.status === 404 ? 'Not found.' : 'Method not allowed.' }, { status: route.status }) as NextResponse
    : NextResponse.rewrite(new URL(route.path, request.url));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  // Preview addresses until the owner approves the sites; remove NY_PUBLIC_SITES_NOINDEX on the final domains.
  if (process.env.NY_PUBLIC_SITES_NOINDEX === '1') response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = { matcher: '/:path*' };
