import type { DemoOrder } from "./orders";

export type StatusTone = "neutral" | "info" | "progress" | "ready" | "success" | "warning" | "danger";
const normalize = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ");

const tones: Record<string, StatusTone> = {
  "upcoming": "info", "not started": "info", "to do": "info", "scheduled": "info", "new": "info", "new request": "info", "order received": "info", "received": "info", "awaiting confirmation": "info",
  "picking & stock check": "progress", "alteration assessment": "progress", "measurements confirmed": "progress", "cutting": "progress", "sewing & construction": "progress", "customer fitting": "progress", "finishing": "progress", "final quality check": "progress", "courier on the way for pickup": "progress", "collected by courier": "progress", "out for delivery": "progress", "courier arranged · awaiting pickup": "warning", "design & quotation approved": "info", "customer update issued": "info", "handover arrangements updated": "info", "packaged": "ready", "garment ready": "ready", "preparing your order": "progress", "in production": "progress", "preparing": "progress", "in progress": "progress", "adjustments in progress": "progress", "your outfit is being made": "progress", "final checks": "progress", "preparing for delivery": "progress",
  "ready for pickup": "ready", "ready for handover": "ready", "ready": "ready", "ready for collection": "ready", "ready for delivery": "ready", "final checks complete": "ready",
  "finished": "success", "completed": "success", "complete": "success", "collected": "success", "delivered": "success", "confirmed": "success", "paid": "success", "in stock": "success", "current": "success", "simulated full payment received": "success",
  "on hold": "warning", "awaiting payment": "warning", "pending approval": "warning", "delayed": "warning", "pending": "warning", "awaiting customer": "warning", "awaiting all outfits": "warning", "needs alternatives": "warning", "other times requested": "warning", "low stock": "warning", "due today": "warning", "due soon": "warning", "action needed": "warning", "payment pending": "warning", "unpaid": "warning", "cancellation requested": "warning",
  "overdue": "danger", "failed": "danger", "payment failed": "danger", "out of stock": "danger", "sold out": "danger", "error": "danger", "blocked": "danger",
  "simulated deposit recorded": "info", "deposit recorded": "info", "refunded": "info",
  "cancelled": "neutral", "canceled": "neutral", "draft": "neutral", "local draft": "neutral", "not recorded": "neutral", "to be agreed": "neutral", "previous": "neutral",
};

export function statusTone(status: string): StatusTone {
  return tones[normalize(status)] ?? "neutral";
}

export function isCancelledStatus(status: string): boolean {
  return ["cancelled", "canceled"].includes(normalize(status));
}

export function isClosedStatus(status: string): boolean {
  return ["cancelled", "canceled", "finished", "completed", "complete", "collected", "delivered"].includes(normalize(status));
}

export function orderAttention(order: DemoOrder, today = new Date().toISOString().slice(0, 10)): { label: string; tone: StatusTone } | undefined {
  if (order.is_complete || isClosedStatus(order.status)) return;
  if (order.expected_completion_date && order.expected_completion_date < today) return { label: "Overdue", tone: "danger" };
  if (order.client_action) return { label: "Action needed", tone: "warning" };
  if (order.expected_completion_date === today) return { label: "Due today", tone: "warning" };
}
