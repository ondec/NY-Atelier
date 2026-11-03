export type DemoOrder = {
  reference: string;
  category: "Ready-to-Wear" | "Custom" | "Alterations";
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

export async function getDemoOrders(): Promise<DemoOrder[]> {
  const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${baseUrl}/api/demo/orders`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Demo orders unavailable (${response.status})`);

  const payload: { demo: boolean; orders: DemoOrder[] } = await response.json();
  if (payload.demo !== true || !Array.isArray(payload.orders)) {
    throw new Error("Unexpected demo order response");
  }
  return payload.orders;
}
