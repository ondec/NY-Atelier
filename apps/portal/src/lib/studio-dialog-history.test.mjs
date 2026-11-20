import test from 'node:test';
import assert from 'node:assert/strict';
import {attachStudioDialogHistory, leaveStudioDialog} from './studio-dialog-history.ts';
function browser() {
  const listeners = new Set();
  const entries = [{state: {studioSaleDesk: true}, href: 'https://studio.example/showroom?view=collection&screen=sale'}];
  let index = 0;
  const host = {
    location: {get href() {return entries[index].href;}},
    history: {
      get state() {return entries[index].state;},
      pushState(state, unused, href) {entries.splice(index + 1); entries.push({state, href}); index++;},
      back() {queueMicrotask(() => {if (index > 0) index--; for (const listener of [...listeners]) listener();});},
    },
    addEventListener(type, listener) {listeners.add(listener);},
    removeEventListener(type, listener) {listeners.delete(listener);},
    get depth() {return index;},
  };
  return host;
}
const settled = async () => {await Promise.resolve(); await Promise.resolve(); await Promise.resolve();};
test('nested panel Back closes the top panel and retains the Sales Desk', async () => {
  const host = browser(); let outer = 0; let inner = 0;
  const closeOuter = attachStudioDialogHistory(host, () => outer++);
  const closeInner = attachStudioDialogHistory(host, () => inner++);
  host.history.back(); await settled(); closeInner();
  assert.equal(inner, 1); assert.equal(outer, 0); assert.equal(host.depth, 1);
  closeOuter(); await settled();
  assert.equal(host.depth, 0); assert.equal(host.history.state.studioSaleDesk, true);
});
test('closing one panel before showing its replacement leaves no duplicate Back entry', async () => {
  const host = browser(); const closeFirst = attachStudioDialogHistory(host, () => {});
  closeFirst(); const closeNext = attachStudioDialogHistory(host, () => {});
  await settled(); assert.equal(host.depth, 1);
  closeNext(); await settled(); assert.equal(host.depth, 0);
});
test('a checkout awaiting confirmation cannot be dismissed by browser Back', async () => {
  const host = browser(); let closed = 0;
  const cleanup = attachStudioDialogHistory(host, () => closed++, () => true);
  host.history.back(); await settled();
  assert.equal(closed, 0); assert.equal(host.depth, 1);
  cleanup(); await settled();
});
test('moving from a customer picker to a form first consumes the picker entry', async () => {
  const host = browser(); let closed = false; let next = false;
  const cleanup = attachStudioDialogHistory(host, () => {closed = true;});
  leaveStudioDialog(host, () => {next = true; assert.equal(host.depth, 0);});
  await settled(); cleanup();
  assert.equal(closed, true); assert.equal(next, true); assert.equal(host.depth, 0);
});
