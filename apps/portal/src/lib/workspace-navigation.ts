// Keep workspace switches inside an installed web app's browser session.
export function workspaceNavigationHref(href: string, standalone: boolean) {
  if (!standalone || !href.startsWith('https://')) return href;
  const url = new URL(href);
  return /^\/(?:office\/(?:owner|manager|receptionist)|showroom)(?:\/|$)/.test(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : href;
}
