// The signed-in customer, shared by the header, the account page and the booking form.
// The session itself is an httpOnly cookie kept by the portal; pages only see the customer's profile.
import { useEffect, useState } from 'react';

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
let current; // undefined = not checked yet, null = signed out
let loading = null;
const listeners = new Set();

function publish(customer) { current = customer; listeners.forEach(listener => listener(customer)); }

/** Calls /api/account/…; throws an Error with a short, readable message. */
export async function accountCall(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${base}/api/account/${path}`, {
    method, cache: 'no-store', credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== 'login' && path !== 'verify') publish(null);
  if (response.status === 429) throw new Error('Too many tries. Please wait a minute and try again.');
  if (!response.ok) throw new Error(Object.values(result.errors ?? {})[0]?.[0] ?? result.message ?? 'Something went wrong. Please try again.');
  return result;
}

export function refreshCustomer() {
  loading ??= accountCall('me').then(result => publish(result.customer ?? null)).catch(() => publish(null)).finally(() => { loading = null; });
  return loading;
}

export function signedIn(customer) { publish(customer); }

export async function signOut() {
  await accountCall('logout', { method: 'POST', body: {} }).catch(() => {});
  publish(null);
}

/** undefined while checking, null when signed out, otherwise the customer. */
export function useCustomer() {
  const [customer, setCustomer] = useState(current);
  useEffect(() => {
    listeners.add(setCustomer);
    if (current === undefined) refreshCustomer(); else setCustomer(current);
    return () => listeners.delete(setCustomer);
  }, []);
  return customer;
}

export const firstName = customer => (customer?.name && customer.name !== 'New customer' ? customer.name.split(' ')[0] : '');
