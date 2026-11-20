import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDemoOrders, type DemoOrder } from './orders';

import { OrderUpdatesContext } from './order-updates-context';
const readKey = 'ny-demo-customer-order-updates-read-v1';

export function OrderUpdatesProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [readLoaded, setReadLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const readRef = useRef<string[]>([]);
  const persist = useRef<Promise<unknown>>(Promise.resolve());
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await getDemoOrders();
      if (mounted.current) { setOrders(next); setUnavailable(false); }
    } catch {
      if (mounted.current) setUnavailable(true);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void AsyncStorage.getItem(readKey).then((stored) => {
      const parsed = JSON.parse(stored ?? '[]');
      if (mounted.current && Array.isArray(parsed)) { const ids = [...new Set([...parsed.filter((id): id is string => typeof id === 'string'), ...readRef.current])]; readRef.current = ids; setRead(ids); }
    }).catch(() => {}).finally(() => { if (mounted.current) setReadLoaded(true); });
    queueMicrotask(() => { if (mounted.current) void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState === null) void refresh(); }, 8000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { mounted.current = false; clearInterval(timer); listener.remove(); };
  }, [refresh]);

  const updates = useMemo(() => orders.flatMap((order) => order.timeline.flatMap((event) => event.id && event.notified_at ? [{ eventId: event.id, id: `${order.reference}:${event.id}`, reference: order.reference, title: event.title === 'Customer update issued' ? event.explanation ?? order.status : event.title, detail: event.title === 'Customer update issued' ? null : event.explanation, at: event.notified_at }] : [])).sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.eventId - a.eventId), [orders]);
  const markRead = useCallback((ids: string[]) => {
    const next = [...new Set([...readRef.current, ...ids])].slice(-500);
    readRef.current = next; setRead(next);
    persist.current = persist.current.catch(() => {}).then(() => AsyncStorage.setItem(readKey, JSON.stringify(next)));
  }, []);
  return <OrderUpdatesContext.Provider value={{ orders, updates, unread: readLoaded ? updates.filter((update) => !read.includes(update.id)).length : 0, isRead: (id) => read.includes(id), markRead, refresh, loading, unavailable }}>{children}</OrderUpdatesContext.Provider>;
}

export function useOrderUpdates() {
  const value = useContext(OrderUpdatesContext);
  if (!value) throw new Error('OrderUpdatesProvider is required.');
  return value;
}
