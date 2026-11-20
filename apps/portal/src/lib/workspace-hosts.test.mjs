import assert from 'node:assert/strict';
import test from 'node:test';
import {staffCookieSettings, workspaceForHost, workspaceHosts, workspaceLinks} from './workspace-hosts.ts';
import {workspaceNavigationHref} from './workspace-navigation.ts';
import {tokenFromCookie} from './staff-cookie.ts';
const env={NY_OFFICE_ORIGIN:'https://office.thenyatelier.com',NY_STUDIO_ORIGIN:'https://studio.thenyatelier.com',NY_STAFF_COOKIE_DOMAIN:'thenyatelier.com'};
const headers=host=>new Headers({host,'x-forwarded-proto':'https'});
test('local previews remain host-only and do not redirect to the future domains',()=>{
  for(const config of [{},env]){
    assert.deepEqual(workspaceLinks(headers('localhost:3000'),'manager',config),{officeHref:'/office/manager',studioHref:'/showroom'});
    const cookie=staffCookieSettings(new Headers({host:'localhost:3000'}),'http://localhost:3000/',config);
    assert.equal(cookie.name,'ny_staff');assert.equal(cookie.options.domain,undefined);assert.equal(cookie.options.secure,false);
  }
});
test('the two configured subdomains share one protected staff cookie',()=>{
  const office=staffCookieSettings(headers('office.thenyatelier.com'),'http://localhost:3000/',env);
  const studio=staffCookieSettings(headers('studio.thenyatelier.com'),'http://localhost:3000/',env);
  assert.deepEqual(office,studio);assert.equal(studio.name,'__Secure-ny_staff');assert.equal(studio.options.domain,'thenyatelier.com');assert.equal(studio.options.httpOnly,true);assert.equal(studio.options.secure,true);assert.equal(studio.options.sameSite,'lax');
  const token='12|'+'a'.repeat(48);
  assert.equal(tokenFromCookie(`ny_staff=old; __Secure-ny_staff=${Buffer.from(token).toString('base64url')}`),token);
});
test('entry and workspace switches keep the staff role and query on the correct host',()=>{
  for(const role of ['owner','manager','receptionist']){
    assert.deepEqual(workspaceLinks(headers('studio.thenyatelier.com'),role,env),{officeHref:`https://office.thenyatelier.com/office/${role}`,studioHref:'https://studio.thenyatelier.com/showroom'});
  }
  assert.equal(workspaceForHost(headers('studio.thenyatelier.com'),env),'studio');
  assert.equal(workspaceForHost(headers('office.thenyatelier.com'),env),'office');
});
test('shared sessions cannot be enabled for HTTP, arbitrary hosts or unrelated domains',()=>{
  for(const host of ['thenyatelier.com','shop.thenyatelier.com','studio.thenyatelier.com.evil.example'])assert.equal(staffCookieSettings(headers(host),'https://example.test/',env).options.domain,undefined);
  assert.throws(()=>staffCookieSettings(new Headers({host:'studio.thenyatelier.com'}),'http://localhost:3000/',env),/HTTPS/);
  assert.throws(()=>workspaceHosts({...env,NY_OFFICE_ORIGIN:'https://unrelated.example'}));
  assert.throws(()=>workspaceHosts({...env,NY_STUDIO_ORIGIN:'http://studio.thenyatelier.com'}));
  assert.throws(()=>workspaceHosts({...env,NY_STUDIO_ORIGIN:'https://studio.thenyatelier.com/path'}));
  assert.throws(()=>workspaceHosts({...env,NY_STUDIO_ORIGIN:env.NY_OFFICE_ORIGIN}));
  assert.throws(()=>workspaceHosts({NY_STAFF_COOKIE_DOMAIN:'thenyatelier.com'}));
});

test('installed app switches stay in their current session while browser links use subdomains',()=>{
 const office='https://office.thenyatelier.com/office/manager?section=orders';
 assert.equal(workspaceNavigationHref(office,true),'/office/manager?section=orders');
 assert.equal(workspaceNavigationHref(office,false),office);
 assert.equal(workspaceNavigationHref('https://studio.thenyatelier.com/showroom',true),'/showroom');
 assert.equal(workspaceNavigationHref('/office/receptionist',true),'/office/receptionist');
});
