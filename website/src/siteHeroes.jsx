import { useEffect, useState } from 'react';

// One request for the hero settings, shared by the pages that use them.
let request = null;
function loadHeroes() {
  if (!request) {
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    request = fetch(`${base}/api/shop/catalogue`, { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Catalogue unavailable'); return response.json(); })
      .then(data => data.heroes ?? {})
      .catch(error => { request = null; throw error; });
  }
  return request;
}

/**
 * The custom hero set in the catalogue manager (Site heroes) for 'website' or 'services', or null to keep the
 * built-in one. `ready` turns true once the answer is known, so the built-in hero doesn't flash first.
 */
export function useSiteHero(site) {
  const [state, setState] = useState({ ready: false, hero: null });
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) setState(current => current.ready ? current : { ready: true, hero: null }); }, 1500);
    loadHeroes().then(heroes => { const hero = heroes[site] ?? null; if (active) setState({ ready: true, hero: hero && { ...hero, media: hero.media.map(siteFile) } }); })
      .catch(() => { if (active) setState({ ready: true, hero: null }); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [site]);
  return state;
}

/** "site:/images/x.webp" is a file already on this website. */
export const siteFile = src => src.startsWith('site:/') ? `${import.meta.env.BASE_URL}${src.slice(6)}` : src;

/** Where a hero button goes on the website: a page here (`to`) or the shop, which is its own app (`href`). */
export function heroLink(to, shopUrl) {
  if (to === 'services') return { to: '/services' };
  if (to === 'appointment') return { to: '/appointment' };
  if (typeof to === 'string' && to.startsWith('collection:')) return { href: `${shopUrl}/collections/${to.slice(11)}` };
  return { href: shopUrl };
}

/** Splits a heading so its last word can be set in italics. */
export function headingParts(title) {
  const words = (title ?? '').trim().split(/\s+/).filter(Boolean);
  return { lead: words.slice(0, -1).join(' '), accent: words.at(-1) ?? '' };
}
