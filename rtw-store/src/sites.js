// The store and the main website are separate sites that link to each other.
// Locally they run side by side (store 5174, website 5173). In production the store is
// rtw.thenyatelier.com and the main website is thenyatelier.com; set VITE_MAIN_SITE_URL to override.
export const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL
  ?? (import.meta.env.DEV ? 'http://localhost:5173' : 'https://thenyatelier.com');

/** A full address on the main website, e.g. mainSite('/consultation'). */
export const mainSite = path => `${MAIN_SITE_URL}${path}`;
