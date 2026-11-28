// The shop lives inside the main website at /shop, so website pages are on the same address:
// the base path without its trailing "shop/" ('' in production, '/home' on the preview).
// import.meta.env is missing when Node runs the build checks, hence the fallback.
export const MAIN_SITE_URL = (import.meta.env?.BASE_URL ?? "/").replace(/shop\/$/, '').replace(/\/$/, '');

/** A page on the main website, e.g. mainSite('/appointment'). */
export const mainSite = path => `${MAIN_SITE_URL}${path}`;
