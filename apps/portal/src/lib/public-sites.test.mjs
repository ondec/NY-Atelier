import test from 'node:test';
import assert from 'node:assert/strict';
const { siteForHost, siteForPath, siteRoute, sitesUseOwnAddresses } = await import('./public-sites.ts');
const env = { NY_WEBSITE_ORIGIN: 'https://thenyatelier.com' };

test('only the website address serves the public site, with the shop at /shop', () => {
  assert.deepEqual(siteForHost('thenyatelier.com', '/', env), { site: 'website', inner: '/' });
  assert.deepEqual(siteForHost('THENYATELIER.com', '/shop', env), { site: 'store', inner: '/' });
  assert.deepEqual(siteForHost('thenyatelier.com', '/shop/product/x', env), { site: 'store', inner: '/product/x' });
  assert.deepEqual(siteForHost('thenyatelier.com', '/shopping', env), { site: 'website', inner: '/shopping' });
  assert.equal(siteForHost('workspace.thenyatelier.com', '/', env), null);
  assert.equal(siteForHost('thenyatelier.com', '/', {}), null);
  assert.throws(() => siteForHost('x', '/', { NY_WEBSITE_ORIGIN: 'http://thenyatelier.com' }));
});

test('pages load the app, files load from the build', () => {
  assert.deepEqual(siteRoute('store', '/product/shop-ember', 'GET'), { kind: 'rewrite', path: '/_sites/store/index.html' });
  assert.deepEqual(siteRoute('website', '/', 'GET'), { kind: 'rewrite', path: '/_sites/website/index.html' });
  assert.deepEqual(siteRoute('website', '/assets/index-abc.js', 'GET'), { kind: 'rewrite', path: '/_sites/website/assets/index-abc.js' });
  assert.deepEqual(siteRoute('website', '/office/owner', 'GET'), { kind: 'rewrite', path: '/_sites/website/index.html' });
  assert.equal(siteRoute('website', '/.env', 'GET').kind, 'block');
});

test('only the public API calls are reachable', () => {
  assert.deepEqual(siteRoute('store', '/api/shop/catalogue', 'GET'), { kind: 'rewrite', path: '/api/public/shop/catalogue' });
  assert.deepEqual(siteRoute('website', '/api/consultations', 'POST'), { kind: 'rewrite', path: '/api/public/consultations' });
  assert.deepEqual(siteRoute('store', '/api/account/me', 'GET'), { kind: 'rewrite', path: '/api/account/me' });
  assert.deepEqual(siteRoute('website', '/api/account/me', 'DELETE'), { kind: 'block', status: 404 });
  assert.deepEqual(siteRoute('website', '/api/consultations/c0115a00-0000-4000-8000-000000000001/view', 'POST'), { kind: 'rewrite', path: '/api/public/consultations/c0115a00-0000-4000-8000-000000000001/view' });
  assert.deepEqual(siteRoute('website', '/api/consultations/c0115a00-0000-4000-8000-000000000001/delete', 'POST'), { kind: 'block', status: 404 });
  assert.deepEqual(siteRoute('website', '/api/size-charts', 'GET'), { kind: 'rewrite', path: '/api/size-charts' });
  assert.deepEqual(siteRoute('store', '/api/size-charts', 'POST'), { kind: 'block', status: 405 });
  assert.deepEqual(siteRoute('website', '/api/consultations', 'GET'), { kind: 'block', status: 405 });
  assert.deepEqual(siteRoute('website', '/api/studio/catalogue', 'GET'), { kind: 'block', status: 404 });
  assert.deepEqual(siteRoute('website', '/api/staff-sign-in', 'POST'), { kind: 'block', status: 404 });
});

test('without its own address the website is a preview under /home, the shop under /home/shop', () => {
  assert.equal(sitesUseOwnAddresses({}), false);
  assert.equal(sitesUseOwnAddresses(env), true);
  assert.equal(sitesUseOwnAddresses({ ...env, NY_PUBLIC_SITES_PREVIEW_PATHS: '1' }), false);
  assert.deepEqual(siteForPath('/home'), { site: 'website', inner: '/' });
  assert.deepEqual(siteForPath('/home/shop/product/shop-ember'), { site: 'store', inner: '/product/shop-ember' });
  assert.deepEqual(siteForPath('/home/api/size-charts'), { site: 'website', inner: '/api/size-charts' });
  assert.equal(siteForPath('/homepage'), null);
  assert.equal(siteForPath('/store/x'), null);
  assert.equal(siteForPath('/office/owner'), null);
});

test('robots.txt and the sitemap come from the portal, for the website only', () => {
  assert.deepEqual(siteRoute('website', '/robots.txt', 'GET'), { kind: 'rewrite', path: '/api/public/site/robots' });
  assert.deepEqual(siteRoute('website', '/sitemap.xml', 'HEAD'), { kind: 'rewrite', path: '/api/public/site/sitemap' });
  assert.deepEqual(siteRoute('website', '/sitemap.xml', 'POST'), { kind: 'block', status: 405 });
  assert.deepEqual(siteRoute('store', '/robots.txt', 'GET'), { kind: 'rewrite', path: '/_sites/store/robots.txt' });
});
