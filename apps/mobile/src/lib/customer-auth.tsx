import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { PasskeyPrompt } from '@/components/passkey-prompt';
import { SignInSheet, type SignInReason } from '@/components/sign-in-sheet';
import { createPasskey, getPasskey, passkeysSupported } from '@/lib/passkeys';

export type SignInChannel = 'email' | 'phone';
export type PasskeyStatus = 'enrolled' | 'required' | 'offer' | 'not_yet';
export type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  firstSignedInAt: string | null;
  passkey: { status: PasskeyStatus; requiredFrom: string | null };
};
export type SignInChallenge = { challengeId: string; channel: SignInChannel; destination: string; expiresAt: string };

type AuthState = { status: 'loading' | 'signed-out' } | { status: 'signed-in'; customer: Customer };
type CustomerAuth = {
  state: AuthState;
  customer: Customer | null;
  /** Opens the sign-in sheet when needed. Resolves true once the customer is signed in. */
  requireSignIn: (reason: SignInReason) => Promise<boolean>;
  startSignIn: (channel: SignInChannel, destination: string) => Promise<SignInChallenge>;
  verifySignIn: (challengeId: string, proof: { code: string } | { token: string }, name?: string) => Promise<Customer>;
  /** True when this phone can create and use passkeys (not the web preview or Expo Go). */
  passkeysAvailable: boolean;
  signInWithPasskey: () => Promise<Customer>;
  addPasskey: () => Promise<Customer>;
  updateName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** The signed-in session token, for API calls that act as this customer. */
  getToken: () => string | null;
};

const tokenKey = 'ny-atelier-customer-session-v1';
type SignedIn = { token: string; customer: Customer };
type Ceremony<T> = { ceremonyId: string; options: T };
const CustomerAuthContext = createContext<CustomerAuth | null>(null);

// Native apps keep the session in the device keychain/keystore. The web preview has no keychain, so it falls back to browser storage.
const sessionStore = {
  get: () => Platform.OS === 'web' ? AsyncStorage.getItem(tokenKey) : SecureStore.getItemAsync(tokenKey),
  set: (token: string) => Platform.OS === 'web' ? AsyncStorage.setItem(tokenKey, token) : SecureStore.setItemAsync(tokenKey, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  clear: () => Platform.OS === 'web' ? AsyncStorage.removeItem(tokenKey) : SecureStore.deleteItemAsync(tokenKey),
};

export class CustomerAuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function apiBase() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000')).replace(/\/$/, '');
}

async function authApi<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api/customer/auth${path}`, {
      ...init,
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new CustomerAuthError('We could not reach NY Atelier. Check your connection and try again.', 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const errors = body?.errors as Record<string, string[]> | undefined;
    const message = (errors && Object.values(errors)[0]?.[0]) || body?.message || 'Something went wrong. Please try again.';
    throw new CustomerAuthError(response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : message, response.status);
  }
  return body as T;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [sheet, setSheet] = useState<{ reason: SignInReason; link?: { challengeId: string; token: string } } | null>(null);
  const waiting = useRef<((signedIn: boolean) => void)[]>([]);
  const token = useRef<string | null>(null);

  const settle = useCallback((signedIn: boolean) => {
    waiting.current.splice(0).forEach(resolve => resolve(signedIn));
  }, []);

  const signedOut = useCallback(async () => {
    token.current = null;
    await sessionStore.clear().catch(() => {});
    setState({ status: 'signed-out' });
  }, []);

  const refresh = useCallback(async () => {
    const saved = token.current ?? await sessionStore.get().catch(() => null);
    if (!saved) { setState({ status: 'signed-out' }); return; }
    token.current = saved;
    try {
      const { customer } = await authApi<{ customer: Customer }>('/me', {}, saved);
      setState({ status: 'signed-in', customer });
    } catch (error) {
      // Only a rejected session signs the customer out; being offline keeps them signed in.
      if (error instanceof CustomerAuthError && error.status === 401) await signedOut();
      else setState(current => current.status === 'loading' ? { status: 'signed-out' } : current);
    }
  }, [signedOut]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Magic links open the app at nyatelier://sign-in?challenge=…&token=…
  useEffect(() => {
    const openLink = (url: string | null) => {
      if (!url) return;
      const { path, hostname, queryParams } = Linking.parse(url);
      const challengeId = queryParams?.challenge, linkToken = queryParams?.token;
      if ((path === 'sign-in' || hostname === 'sign-in') && typeof challengeId === 'string' && typeof linkToken === 'string') {
        setSheet(current => ({ reason: current?.reason ?? 'link', link: { challengeId, token: linkToken } }));
      }
    };
    void Linking.getInitialURL().then(openLink);
    const subscription = Linking.addEventListener('url', event => openLink(event.url));
    return () => subscription.remove();
  }, []);

  const startSignIn = useCallback((channel: SignInChannel, destination: string) =>
    authApi<SignInChallenge>('/start', { method: 'POST', body: JSON.stringify({ channel, destination }) }), []);

  const keepSession = useCallback(async (result: SignedIn) => {
    token.current = result.token;
    await sessionStore.set(result.token);
    setState({ status: 'signed-in', customer: result.customer });
    return result.customer;
  }, []);

  const verifySignIn = useCallback(async (challengeId: string, proof: { code: string } | { token: string }, name?: string) =>
    keepSession(await authApi<SignedIn>('/verify', { method: 'POST', body: JSON.stringify({ challengeId, ...proof, name: name?.trim() || undefined }) })), [keepSession]);

  const passkeysAvailable = useMemo(() => passkeysSupported(), []);

  const signInWithPasskey = useCallback(async () => {
    const { ceremonyId, options } = await authApi<Ceremony<Parameters<typeof getPasskey>[0]>>('/passkey/login/options', { method: 'POST' });
    const credential = await getPasskey(options);
    return keepSession(await authApi<SignedIn>('/passkey/login', { method: 'POST', body: JSON.stringify({ ceremonyId, credential }) }));
  }, [keepSession]);

  const addPasskey = useCallback(async () => {
    const { ceremonyId, options } = await authApi<Ceremony<Parameters<typeof createPasskey>[0]>>('/passkeys/options', { method: 'POST' }, token.current);
    const credential = await createPasskey(options);
    const { customer } = await authApi<{ customer: Customer }>('/passkeys', { method: 'POST', body: JSON.stringify({ ceremonyId, credential, name: Platform.OS === 'ios' ? 'iPhone' : 'Android phone' }) }, token.current);
    setState({ status: 'signed-in', customer });
    return customer;
  }, []);

  const updateName = useCallback(async (name: string) => {
    const { customer } = await authApi<{ customer: Customer }>('/me', { method: 'PATCH', body: JSON.stringify({ name }) }, token.current);
    setState({ status: 'signed-in', customer });
  }, []);

  const signOut = useCallback(async () => {
    const current = token.current;
    if (current) await authApi('/logout', { method: 'POST' }, current).catch(() => {});
    await signedOut();
  }, [signedOut]);

  const requireSignIn = useCallback((reason: SignInReason) => {
    if (state.status === 'signed-in') return Promise.resolve(true);
    return new Promise<boolean>(resolve => {
      waiting.current.push(resolve);
      setSheet(current => current ?? { reason });
    });
  }, [state.status]);

  const getToken = useCallback(() => token.current, []);

  const value = useMemo<CustomerAuth>(() => ({
    state, customer: state.status === 'signed-in' ? state.customer : null,
    requireSignIn, startSignIn, verifySignIn, passkeysAvailable, signInWithPasskey, addPasskey, updateName, signOut, refresh, getToken,
  }), [state, requireSignIn, startSignIn, verifySignIn, passkeysAvailable, signInWithPasskey, addPasskey, updateName, signOut, refresh, getToken]);

  return <CustomerAuthContext.Provider value={value}>
    {children}
    {sheet ? <SignInSheet
      key={sheet.link?.token ?? 'sign-in'}
      reason={sheet.reason}
      link={sheet.link}
      start={startSignIn}
      verify={verifySignIn}
      passkey={passkeysAvailable ? signInWithPasskey : undefined}
      onSignedIn={() => { setSheet(null); settle(true); }}
      onClose={() => { setSheet(null); settle(false); }}
    /> : null}
    {!sheet && passkeysAvailable && state.status === 'signed-in' ? <PasskeyPrompt key={`${state.customer.id}:${state.customer.passkey.status}`} customer={state.customer} addPasskey={addPasskey} /> : null}
  </CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('CustomerAuthProvider is missing');
  return context;
}
