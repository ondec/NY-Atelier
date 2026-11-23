type Environment = Record<string, string | undefined>;
type HeaderSource = Pick<Headers, 'get'>;
type Workspace = 'office' | 'studio';

// Subdomain access is opt-in. Local previews keep their existing host-only session.
export function workspaceHosts(env: Environment = process.env) {
  const values = [env.NY_OFFICE_ORIGIN, env.NY_STUDIO_ORIGIN, env.NY_STAFF_COOKIE_DOMAIN];
  if (values.every(value => !value)) return undefined;
  if (values.some(value => !value)) throw new Error('Configure both workspace origins and the staff cookie domain together.');
  const domain = env.NY_STAFF_COOKIE_DOMAIN!.toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) throw new Error('Invalid staff cookie domain.');
  const parse = (value: string) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.hostname.endsWith(`.${domain}`)) {
      throw new Error('Staff workspaces must use HTTPS subdomains of the configured cookie domain.');
    }
    return url;
  };
  const office = parse(env.NY_OFFICE_ORIGIN!);
  const studio = parse(env.NY_STUDIO_ORIGIN!);
  if (office.host === studio.host) throw new Error('Office and Studio must have different hosts.');
  return { office, studio, domain };
}

export function publicHost(headers: HeaderSource) {
  return (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').toLowerCase();
}

function activeHosts(headers: HeaderSource, env: Environment) {
  const hosts = workspaceHosts(env);
  const host = publicHost(headers);
  return hosts && (host === hosts.office.host || host === hosts.studio.host) ? hosts : undefined;
}

export function workspaceForHost(headers: HeaderSource, env: Environment = process.env): Workspace {
  const hosts = activeHosts(headers, env);
  return hosts && publicHost(headers) === hosts.studio.host ? 'studio' : 'office';
}

export function workspaceLinks(headers: HeaderSource, role: 'owner' | 'manager' | 'receptionist', env: Environment = process.env) {
  const hosts = activeHosts(headers, env);
  return {
    officeHref: `${hosts?.office.origin ?? ''}/office/${role}`,
    studioHref: `${hosts?.studio.origin ?? ''}/showroom`,
  };
}

export function staffCookieSettings(headers: HeaderSource, requestUrl: string, env: Environment = process.env) {
  const hosts = activeHosts(headers, env);
  const secure = (headers.get('x-forwarded-proto') ?? new URL(requestUrl).protocol.replace(':', '')) === 'https';
  if (hosts && !secure) throw new Error('Staff subdomain sign-in requires HTTPS.');
  return {
    name: hosts ? '__Secure-ny_staff' : 'ny_staff',
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 28800, secure, ...(hosts ? { domain: hosts.domain } : {}) },
  };
}

const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

// Office catalogue drafts publish to the shared Studio catalogue from the developer's Mac or from the configured
// HTTPS Office host. Other hosts (for example a LAN address used to preview on a phone) never publish.
export function catalogueSyncAllowed(headers: HeaderSource, env: Environment = process.env) {
  const host = publicHost(headers);
  if (loopbackHost.test(host)) return true;
  const hosts = activeHosts(headers, env);
  return Boolean(hosts && host === hosts.office.host);
}
