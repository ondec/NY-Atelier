import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export const demoCustomer = {
  id: 'NY-DEMO-001',
  name: 'Ama Mensah',
  email: 'ama.mensah@example.com',
} as const;

export type ConsultationRequest = {
  id: string;
  method: 'in-person' | 'virtual';
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  status: 'awaiting-confirmation';
};

type DemoCustomerContextValue = {
  requests: ConsultationRequest[];
  addRequest: (request: Omit<ConsultationRequest, 'id' | 'status'>) => void;
};

const storageKey = 'ny-atelier-demo-consultations-v1';
const DemoCustomerContext = createContext<DemoCustomerContextValue | null>(null);

export function DemoCustomerProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setRequests(parsed.filter((item) => item && typeof item.id === 'string' && item.status === 'awaiting-confirmation'));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(storageKey, JSON.stringify(requests)).catch(() => {});
  }, [loaded, requests]);

  const addRequest = (request: Omit<ConsultationRequest, 'id' | 'status'>) => {
    setRequests((current) => [{ ...request, id: `NY-CONS-${Date.now()}`, status: 'awaiting-confirmation' }, ...current]);
  };

  return <DemoCustomerContext.Provider value={{ requests, addRequest }}>{children}</DemoCustomerContext.Provider>;
}

export function useDemoCustomer() {
  const context = useContext(DemoCustomerContext);
  if (!context) throw new Error('DemoCustomerProvider is missing');
  return context;
}
