// One shopping bag for the RTW store and the main website.
// KEEP IN SYNC: the same file lives at rtw-store/src/shared-bag.js and website/src/shared-bag.js.
//
// The two sites sit on different addresses (rtw.thenyatelier.com and thenyatelier.com; locally
// localhost:5174 and localhost:5173), so browser storage is not shared between them. A cookie is:
// on *.thenyatelier.com it is set for the parent domain, and on localhost cookies ignore the port.
// Each line carries a small snapshot (name, colour, price, photo) so either site can show the bag
// without the other's catalogue. Guests need no account. When customer sign-in comes to the web,
// a signed-in bag can also be saved to the account so it follows the customer between devices.

const COOKIE = 'ny_bag';
const MAX_LINES = 20;
const MAX_QTY = 25;
const LIMIT = 3800; // stay under the 4 KB cookie limit

function cookieDomain() {
  const host = window.location.hostname;
  return host === 'thenyatelier.com' || host.endsWith('.thenyatelier.com') ? '; domain=.thenyatelier.com' : '';
}

const clean = lines => (Array.isArray(lines) ? lines : [])
  .filter(line => line && typeof line.id === 'string' && typeof line.size === 'string' && Number.isFinite(line.qty) && line.qty > 0)
  .slice(0, MAX_LINES)
  .map(line => ({ ...line, qty: Math.min(MAX_QTY, Math.floor(line.qty)) }));

export function readBag() {
  try {
    const match = document.cookie.split('; ').find(part => part.startsWith(`${COOKIE}=`));
    return match ? clean(JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)))) : [];
  } catch {
    return [];
  }
}

export function writeBag(lines) {
  let next = clean(lines);
  let value = encodeURIComponent(JSON.stringify(next));
  // If the bag is too big for a cookie, drop photos first (they can be looked up again), then lines.
  if (value.length > LIMIT) { next = next.map(({ image, ...rest }) => rest); value = encodeURIComponent(JSON.stringify(next)); }
  while (value.length > LIMIT && next.length) { next = next.slice(0, -1); value = encodeURIComponent(JSON.stringify(next)); }
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${cookieDomain()}${secure}`;
  return next;
}

/** Calls back when the bag changes in another tab or on the other site. Returns an unsubscribe. */
export function watchBag(callback) {
  let last = JSON.stringify(readBag());
  const check = () => {
    const now = JSON.stringify(readBag());
    if (now !== last) { last = now; callback(JSON.parse(now)); }
  };
  const timer = window.setInterval(() => { if (document.visibilityState === 'visible') check(); }, 1500);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  return () => { window.clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
}

export const sameLine = (a, b) => a.id === b.id && a.colour === b.colour && a.size === b.size;
export const bagCount = lines => lines.reduce((sum, line) => sum + line.qty, 0);
export const bagTotal = lines => lines.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0);
export { MAX_QTY };
