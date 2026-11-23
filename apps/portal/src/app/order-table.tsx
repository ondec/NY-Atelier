import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";
import { orderAttention } from "@/lib/status";
import StatusBadge from "./status-badge";
import {orderSourceLabel} from '@/lib/order-source';

export const orderDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "To be agreed";
export const serviceName = (order: DemoOrder) => order.category === "Custom" ? "Atelier" : order.category;

export const orderHref = (reference: string, section: string = "orders") =>
  `/?section=${section}&order=${encodeURIComponent(reference)}`;

export function OrderTable({ orders, unavailable, section = "orders", onOpenOrder, showFulfilment = false, showPayment = false, showSource = false }: { orders: DemoOrder[]; unavailable: boolean; section?: string; onOpenOrder?: (order: DemoOrder) => void; showFulfilment?: boolean; showPayment?: boolean; showSource?: boolean }) {
  if (unavailable) return <div className="empty-state">Orders are unavailable. Start the local NY Atelier API, then refresh this page.</div>;
  if (!orders.length) return <div className="empty-state">No orders in this view.</div>;
  return <div className="table-wrap"><table className="order-table"><thead><tr><th>Order</th><th>Customer</th><th>Service</th>{showSource && <th>Source</th>}<th>Stage</th><th>Expected</th>{showFulfilment && <th>Fulfilment</th>}{showPayment && <th>Payment</th>}<th><span className="sr-only">Details</span></th></tr></thead><tbody>{orders.map((order) => {
    const attention = orderAttention(order);
    return <tr key={order.reference} data-attention={attention?.tone}>
    <td className="order-reference">{onOpenOrder ? <button type="button" className="order-reference-button" onClick={() => onOpenOrder(order)}><strong>{order.reference}</strong></button> : <Link prefetch={false} href={orderHref(order.reference, section)}><strong>{order.reference}</strong></Link>}<span>{order.items.map((item) => item.garment_name).join(" · ")}</span></td>
    <td>{order.customer_name}</td><td><span className="service-pill">{serviceName(order)}</span></td>{showSource && <td><span className="order-source-label">{orderSourceLabel(order.source)}</span></td>}<td><div className="order-status-stack"><StatusBadge status={order.status} />{attention && <StatusBadge status={attention.label} tone={attention.tone} />}</div></td><td>{orderDate(order.expected_completion_date)}</td>
    {showFulfilment && <td>{order.fulfilment_method ?? "To be agreed"}</td>}
    {showPayment && <td><StatusBadge status={order.payment_status ?? "Not recorded"}/></td>}
    <td>{onOpenOrder ? <button type="button" className="order-detail-link" onClick={() => onOpenOrder(order)} aria-label={`View order ${order.reference}`} title="View order details"><ChevronRight size={17} aria-hidden="true" /></button> : <Link prefetch={false} className="order-detail-link" href={orderHref(order.reference, section)} aria-label={`View order ${order.reference}`} title="View order details"><ChevronRight size={17} aria-hidden="true" /></Link>}</td>
  </tr>;})}</tbody></table></div>;
}
