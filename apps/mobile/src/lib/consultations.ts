import { Platform } from 'react-native';

export type ConsultationSlot = { date: string; time: string };
export type ConsultationInput = {
  method: 'in-person' | 'virtual';
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
};
export type ConsultationRequest = ConsultationInput & {
  id: string;
  status: 'awaiting-confirmation' | 'awaiting-customer' | 'needs-alternatives' | 'confirmed' | 'local-draft';
  options: ConsultationSlot[];
  confirmedDate: string | null;
  confirmedTime: string | null;
  version: number;
  order_reference?: string | null;
};

export function formatConsultationTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

export async function consultationApi<T>(path = '', init?: RequestInit): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000');
  const response = await fetch(`${base}/api/demo/consultations${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Consultations are unavailable. Try again.');
  }
  return response.json();
}
