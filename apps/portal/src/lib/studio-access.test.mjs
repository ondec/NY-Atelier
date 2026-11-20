import assert from 'node:assert/strict';
import test from 'node:test';
import {tokenFromCookie} from './staff-cookie.ts';
import {sameOrigin} from './request-security.ts';
import {can,sectionAllowed,officeHref} from './staff-permissions.ts';
const receptionist={id:3,name:'Reception',email:'reception@example.test',role:'receptionist',permissions:['office','studio','customers','consultations','orders.read','alterations.create'],officeHref:'/office/receptionist'};
test('staff access uses an opaque session token, never a local address, role flag or old pairing cookie',()=>{
  assert.equal(tokenFromCookie(null),undefined);assert.equal(tokenFromCookie('ny_studio='+'a'.repeat(64)),undefined);assert.equal(tokenFromCookie('ny_staff=owner'),undefined);
  const token='17|'+'a'.repeat(48);assert.equal(tokenFromCookie('ny_staff='+Buffer.from(token).toString('base64url')),token);
  assert.equal(tokenFromCookie('ny_staff='+Buffer.from('owner|role=owner').toString('base64url')),undefined);
});
test('state changes require same-origin requests, including the Studio preview host',()=>{
  assert.equal(sameOrigin(new Request('https://studio.example/api',{method:'POST',headers:{host:'localhost:3000','x-forwarded-host':'studio.example',origin:'https://studio.example'}})),true);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api',{method:'POST',headers:{host:'localhost:3000'}})),false);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api',{method:'POST',headers:{host:'localhost:3000',origin:'https://untrusted.example'}})),false);
});
test('receptionist Office has shared customer operations without management-only views',()=>{
  for(const area of ['overview','orders','appointments','customers'])assert.equal(sectionAllowed(receptionist,area),true);
  for(const area of ['team','finances','inventory','collections','atelier','production-inventory'])assert.equal(sectionAllowed(receptionist,area),false);
  assert.equal(can(receptionist,'studio'),true);assert.equal(can(receptionist,'orders.manage'),false);assert.equal(can(null,'studio'),false);
});
test('Office routes derive from the signed-in role and manager reports remain owner-only',()=>{
  assert.equal(officeHref('manager'),'/office/manager');assert.equal(officeHref('receptionist'),'/office/receptionist');
  const manager={...receptionist,role:'manager',permissions:[...receptionist.permissions,'orders.manage','catalogue.manage','finances']};
  assert.equal(sectionAllowed(manager,'finances','sales'),true);assert.equal(sectionAllowed(manager,'finances','reports'),false);assert.equal(sectionAllowed(manager,'team'),false);
});
test('Office access requires its own permission for every role, including Studio staff',()=>{
  for(const role of ['owner','manager','receptionist']){
    const studioOnly={...receptionist,role,permissions:['studio','customers','orders.read']};
    assert.equal(can(studioOnly,'studio'),true);
    assert.equal(can(studioOnly,'office'),false);
    assert.equal(can({...studioOnly,permissions:[...studioOnly.permissions,'office']},'office'),true);
  }
  assert.equal(can(null,'office'),false);
  assert.equal(can({...receptionist,permissions:['office']},'studio'),false);
});
