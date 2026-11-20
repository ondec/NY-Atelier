import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { consultationApi, type ConsultationInput, type ConsultationRequest } from './consultations';

export const demoCustomer = {
  id: 'NY-DEMO-001',
  name: 'Ama Mensah',
  email: 'ama.mensah@example.com',
} as const;

type DemoCustomerContextValue = {
  requests: ConsultationRequest[];
  unavailable: boolean;
  refreshRequests: () => Promise<void>;
  addRequest: (request: ConsultationInput, id: string) => Promise<void>;
  respondToRequest: (request: ConsultationRequest, option?: number) => Promise<void>;
};

const storageKey = 'ny-atelier-demo-consultations-v1';
const DemoCustomerContext = createContext<DemoCustomerContextValue | null>(null);
export const createConsultationId = Crypto.randomUUID;

export function DemoCustomerProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<ConsultationRequest[]>([]);
  const [drafts, setDrafts] = useState<ConsultationRequest[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const revision = useRef(0);

  const refreshRequests = useCallback(async () => {
    const attempt = ++revision.current;
    try {
      const rows = await consultationApi<ConsultationRequest[]>();
      if (attempt !== revision.current) return;
      setRemote(rows);
      setUnavailable(false);
    } catch {
      if (attempt === revision.current) setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (!mounted || !stored) return;
      const rows: ConsultationRequest[] = JSON.parse(stored);
      if (Array.isArray(rows)) {
        setDrafts(rows.filter((row) => row?.id && row.status === 'awaiting-confirmation')
          .map((row) => ({ ...row, status: 'local-draft' })));
      }
    }).catch(() => {});
    queueMicrotask(() => { if (mounted) void refreshRequests(); });
    const invalidateRefresh = () => { revision.current++; };
    const timer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState === null) void refreshRequests(); }, 8000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refreshRequests(); });
    return () => {
      mounted = false;
      invalidateRefresh();
      clearInterval(timer);
      listener.remove();
    };
  }, [refreshRequests]);

  function applyRequest(row: ConsultationRequest) {
    revision.current++;
    setRemote((current) => current.some((item) => item.id === row.id)
      ? current.map((item) => item.id === row.id && item.version <= row.version ? row : item)
      : [row, ...current]);
    setUnavailable(false);
  }

  async function addRequest(request: ConsultationInput, id: string) {
    applyRequest(await consultationApi('', { method: 'POST', body: JSON.stringify({ ...request, id }) }));
  }

  async function respondToRequest(request: ConsultationRequest, option?: number) {
    try {
      applyRequest(await consultationApi(`/${request.id}/customer`, {
        method: 'PATCH',
        body: JSON.stringify({ action: option === undefined ? 'decline' : 'accept', option, version: request.version }),
      }));
    } catch (error) {
      void refreshRequests();
      throw error;
    }
  }

  return <DemoCustomerContext.Provider value={{ requests: [...remote, ...drafts], unavailable, refreshRequests, addRequest, respondToRequest }}>{children}</DemoCustomerContext.Provider>;
}

export function useDemoCustomer() {
  const context = useContext(DemoCustomerContext);
  if (!context) throw new Error('DemoCustomerProvider is missing');
  return context;
}
