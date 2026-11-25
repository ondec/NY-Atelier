import { staffBackendHeaders } from "./staff-session";
import type {OrderSource} from './order-source';
export type OrderNotice = {
  in_app: string | null;
  channel: "email" | "sms" | null;
  status: "pending" | "submitting" | "submitted" | "not_connected" | "no_contact" | "failed" | "superseded" | null;
};
export type OrderStage = {
  key: string; label: string; action: string; help: string; phase: string;
  optional?: boolean; terminal?: boolean; note_required?: boolean; notify?: boolean; in_production?: boolean; auto?: boolean;
  is_current?: boolean; recorded_at?: string | null; state?: "recorded" | "skipped" | "unrecorded" | "upcoming";
};
export type OrderWorkflow = {
  version: number; current: string; closed: boolean; legacy: boolean;
  steps: OrderStage[]; next: OrderStage | null;
  can_manage: boolean; can_advance?: boolean; advance_blocked?: string | null; can_cancel: boolean; can_edit_handover: boolean; can_change_method: boolean; can_mark_items: boolean;
  notification_route?: "email" | "sms" | "no_contact";
  current_notification?: OrderNotice | null; latest_notification?: OrderNotice | null;
};

export type DemoOrder = {
  original_category?: string | null;
  source?: OrderSource | null;
  workflow?: OrderWorkflow;
  handover_instructions?: string | null;
  specifications?: string | null;
  /** Custom and alteration orders only: the handover to NY Production. */
  production?: { sent_at: string | null; sent_by: string | null; returned_at: string | null; return_reason: string | null; finished?: boolean; missing: string[]; can_prepare: boolean; can_send: boolean } | null;
  assigned_tailor?: { id: number; name: string } | null;
  assigned_at?: string | null;
  attachments?: { id: string; name: string; mime_type: string; size: number }[];
  delivery?: { recipient_name: string | null; phone: string | null; address: string; area: string | null; gps_code: string | null; directions: string | null; latitude: number | null; longitude: number | null } | null;
  courier_name?: string | null;
  tracking_reference?: string | null;
  reference: string;
  category: "Ready-to-Wear" | "Custom" | "Alterations";
  customer_name: string;
  status: string;
  service_offering?: string | null;
  consultation_id?: string | null;
  measurement_id?: number | null;
  customer_id?: number;
  expected_completion_date: string | null;
  date_change_explanation: string | null;
  fulfilment_method: string | null;
  fulfilment_status: string | null;
  payment_status?: string | null;
  client_action: string | null;
  completed_at?: string | null;
  is_complete: boolean;
  item_count: number;
  completed_item_count: number;
  items: {
    id?: number;
    is_ready?: boolean;
    garment_name: string;
    wearer_name: string | null;
    status: string;
    expected_completion_date: string | null;
  }[];
  timeline: {
    id?: number;
    stage_key?: string | null;
    action_type?: string | null;
    client_visible?: boolean;
    notified_at?: string | null;
    notification?: OrderNotice | null;
    title: string;
    explanation: string | null;
    occurred_at: string;
  }[];
};

export async function getDemoOrders(staff = false): Promise<DemoOrder[]> {
  const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${baseUrl}/api/demo/${staff ? "staff/orders" : "orders"}`, { cache: "no-store", ...(staff ? {headers:await staffBackendHeaders()}: {}) });
  if (!response.ok) throw new Error(`Demo orders unavailable (${response.status})`);

  const payload: { demo: boolean; orders: DemoOrder[] } = await response.json();
  if (payload.demo !== true || !Array.isArray(payload.orders)) {
    throw new Error("Unexpected demo order response");
  }
  return payload.orders;
}
