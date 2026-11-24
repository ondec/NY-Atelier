import test from 'node:test';
import assert from 'node:assert/strict';
const { siteForHost, siteForPath, siteRoute, sitesUseOwnAddresses } = await import('./public-sites.ts');
const env = { NY_WEBSITE_ORIGIN: 'https://home.thenyatelier.com', NY_STORE_ORIGIN: 'https://store.thenyatelier.com' };

test('only the configured addresses serve the public sites', () => {
  assert.equal(siteForHost('home.thenyatelier.com', env), 'website');
  assert.equal(siteForHost('STORE.thenyatelier.com', env), 'store');
  assert.equal(siteForHost('office.thenyatelier.com', env), null);
  assert.equal(siteForHost('home.thenyatelier.com', {}), null);
  assert.throws(() => siteForHost('x', { NY_WEBSITE_ORIGIN: 'http://home.thenyatelier.com' }));
});

test('pages load the app, files load from the build', () => {
  assert.deepEqual(siteRoute('store', '/product/shop-ember', 'GET'), { kind: 'rewrite', path: '/_sites/store/index.html' });
  assert.deepEqual(siteRoute('website', '/', 'GET'), { kind: 'rewrite', path: '/_sites/website/index.html' });
  assert.deepEqual(siteRoute('website', '/assets/index-abc.js', 'GET'), { kind: 'rewrite', path: '/_sites/website/assets/index-abc.js' });
  assert.deepEqual(siteRoute('website', '/office/owner', 'GET'), { kind: 'rewrite', path: '/_sites/website/index.html' });
  assert.equal(siteRoute('website', '/.env', 'GET').kind, 'block');
});

test('only each site\'s own public API calls are reachable', () => {
  assert.deepEqual(siteRoute('store', '/api/shop/catalogue', 'GET'), { kind: 'rewrite', path: '/api/public/shop/catalogue' });
  assert.deepEqual(siteRoute('website', '/api/consultations', 'POST'), { kind: 'rewrite', path: '/api/public/consultations' });
  assert.deepEqual(siteRoute('store', '/api/size-charts', 'GET'), { kind: 'rewrite', path: '/api/size-charts' });
  assert.deepEqual(siteRoute('store', '/api/size-charts', 'POST'), { kind: 'block', status: 405 });
  assert.deepEqual(siteRoute('website', '/api/consultations', 'GET'), { kind: 'block', status: 405 });
  assert.deepEqual(siteRoute('store', '/api/consultations', 'POST'), { kind: 'block', status: 404 });
  assert.deepEqual(siteRoute('website', '/api/studio/catalogue', 'GET'), { kind: 'block', status: 404 });
  assert.deepEqual(siteRoute('website', '/api/staff-sign-in', 'POST'), { kind: 'block', status: 404 });
});

test('without own addresses the sites are previews under /home and /store', () => {
  assert.equal(sitesUseOwnAddresses({}), false);
  assert.equal(sitesUseOwnAddresses(env), true);
  assert.equal(sitesUseOwnAddresses({ ...env, NY_PUBLIC_SITES_PREVIEW_PATHS: '1' }), false);
  assert.deepEqual(siteForPath('/home'), { site: 'website', inner: '/' });
  assert.deepEqual(siteForPath('/store/product/shop-ember'), { site: 'store', inner: '/product/shop-ember' });
  assert.deepEqual(siteForPath('/store/api/size-charts'), { site: 'store', inner: '/api/size-charts' });
  assert.equal(siteForPath('/homepage'), null);
  assert.equal(siteForPath('/office/owner'), null);
});
