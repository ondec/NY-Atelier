import { Platform } from 'react-native';

export type { ConsultationSlot, ConsultationInput, ConsultationRequest } from './consultation-types';

export function formatConsultationTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Signed-in customers book under their own account (/api/customer/consultations), so NY Office
 * sees who asked. Without a token the app falls back to the demo queue, which only exists while
 * the API's demo mode is on.
 */
export async function consultationApi<T>(path = '', init?: RequestInit, token?: string | null): Promise<T> {
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000')).replace(/\/$/, '');
  const response = await fetch(`${base}/api/${token ? 'customer' : 'demo'}/consultations${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Consultations are unavailable. Try again.');
  }
  return response.json();
}
