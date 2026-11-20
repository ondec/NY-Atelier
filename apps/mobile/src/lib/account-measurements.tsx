import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fittingsKey, parseMeasurementHistory, updateMeasurementHistory, type AccountFitting } from './measurement-history';

type MeasurementsContextValue = {
  fittings: AccountFitting[]; ready: boolean; loadError: string;
  saveMeasurements: (values: Record<string, string>, options?: { replace?: boolean; editSession?: string }) => Promise<void>;
};
const MeasurementsContext = createContext<MeasurementsContextValue | null>(null);
export function AccountMeasurementsProvider({ children }: { children: ReactNode }) {
  const [fittings, setFittings] = useState<AccountFitting[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const stored = useRef<AccountFitting[]>([]);
  const loaded = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(fittingsKey).then(raw => {
      const history = parseMeasurementHistory(raw);
      if (active) { stored.current = history; loaded.current = true; setFittings(history); }
    }).catch(() => { if (active) setLoadError('Your saved measurements could not be loaded. Reopen the app to try again.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const saveMeasurements = useCallback((values: Record<string, string>, options: { replace?: boolean; editSession?: string } = {}) => {
    const task = queue.current.catch(() => {}).then(async () => {
      if (!loaded.current) throw new Error('Your measurements are still loading. Please try again.');
      const next = updateMeasurementHistory(stored.current, values, options);
      if (next === stored.current) return;
      await AsyncStorage.setItem(fittingsKey, JSON.stringify(next));
      stored.current = next;
      setFittings(next);
    });
    queue.current = task;
    return task;
  }, []);
  return <MeasurementsContext.Provider value={{ fittings, ready, loadError, saveMeasurements }}>{children}</MeasurementsContext.Provider>;
}
export function useAccountMeasurements() {
  const context = useContext(MeasurementsContext);
  if (!context) throw new Error('AccountMeasurementsProvider is missing');
  return context;
}
