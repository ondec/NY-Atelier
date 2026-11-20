import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { emptyPublishedSizing, validatePublishedSizing, type PublishedSizing } from './sizing';

const SizingContext = createContext<{ publication: PublishedSizing; unavailable: boolean }>({ publication: emptyPublishedSizing, unavailable: false });
const storageKey = 'ny-atelier-published-sizing-v1';
export function PublishedSizingProvider({ children }: { children: ReactNode }) {
  const [publication, setPublication] = useState<PublishedSizing>(emptyPublishedSizing);
  const [unavailable, setUnavailable] = useState(false);
  const mounted = useRef(false);
  const attempts = useRef(0);
  const refresh = useCallback(async () => {
    const base = process.env.EXPO_PUBLIC_SIZE_GUIDE_BASE_URL;
    if (!base) return;
    const attempt = ++attempts.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/api/size-charts`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Size charts unavailable.');
      const data = validatePublishedSizing(await response.json());
      if (!mounted.current || attempt !== attempts.current) return;
      setPublication(data); setUnavailable(false);
      await AsyncStorage.setItem(storageKey, JSON.stringify({ base, data })).catch(() => {});
    } catch (error) { if (mounted.current && attempt === attempts.current) { setUnavailable(true); if (__DEV__) console.warn('Size guide update unavailable', base, error); } }
    finally { clearTimeout(timer); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (!raw || !mounted.current) return;
      const cache = JSON.parse(raw);
      if (cache.base === process.env.EXPO_PUBLIC_SIZE_GUIDE_BASE_URL) setPublication(validatePublishedSizing(cache.data));
    }).catch(() => {}).finally(() => { if (mounted.current) void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState === null) void refresh(); }, 15000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const invalidate = () => { attempts.current++; };
    return () => { mounted.current = false; invalidate(); clearInterval(timer); listener.remove(); };
  }, [refresh]);
  return <SizingContext.Provider value={{ publication, unavailable }}>{children}</SizingContext.Provider>;
}
export const usePublishedSizing = () => useContext(SizingContext);
