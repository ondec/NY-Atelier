import { Platform } from 'react-native';

export type DemoOrder = {
  reference: string;
  category: 'Ready-to-Wear' | 'Custom' | 'Alterations';
  customer_name: string;
  status: string;
  expected_completion_date: string | null;
  date_change_explanation: string | null;
  fulfilment_method: string | null;
  fulfilment_status: string | null;
  payment_status: string | null;
  client_action: string | null;
  is_complete: boolean;
  item_count: number;
  completed_item_count: number;
  items: {
    garment_name: string;
    wearer_name: string | null;
    status: string;
    expected_completion_date: string | null;
  }[];
  timeline: {
    title: string;
    explanation: string | null;
    occurred_at: string;
  }[];
};

const defaultLocalUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000';

export async function getDemoOrders(): Promise<DemoOrder[]> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultLocalUrl;
  const response = await fetch(`${baseUrl}/api/demo/orders`);
  if (!response.ok) throw new Error(`Orders unavailable (${response.status})`);

  const payload: { demo: boolean; orders: DemoOrder[] } = await response.json();
  if (payload.demo !== true || !Array.isArray(payload.orders)) {
    throw new Error('Unexpected demo order response');
  }
  return payload.orders;
}

export function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(`${value}T12:00:00Z`))
    : 'To be agreed';
}
