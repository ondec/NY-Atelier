import { createContext } from 'react';
import type { DemoOrder } from './orders';

export type Update = { eventId: number; id: string; reference: string; title: string; detail: string | null; at: string };
export type OrderUpdates = { orders: DemoOrder[]; updates: Update[]; unread: number; isRead: (id: string) => boolean; markRead: (ids: string[]) => void; refresh: () => Promise<void>; loading: boolean; unavailable: boolean };
export const OrderUpdatesContext = createContext<OrderUpdates | null>(null);
