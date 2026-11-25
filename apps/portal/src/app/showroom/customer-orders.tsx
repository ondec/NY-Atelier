"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ClipboardList, X } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";
import { orderAttention } from "@/lib/status";
import CreateStaffOrder from "../create-staff-order";
import { InventoryDrawer } from "../catalogue-editor";
import OrderDetailsContent from "../order-details-content";
import StatusBadge from "../status-badge";
import { orderDate } from "../order-table";

const categoryLabel = (order: DemoOrder) => order.category === "Custom" ? "Custom order" : "Alteration";

/** The custom and alteration orders that belong to one customer, opened from their NY Studio profile. */
export default function CustomerOrders({ customerId, customerName, fittingId, canCreate, revision, onCreated }: {
  customerId: number; customerName: string; fittingId?: number; canCreate: boolean; revision: number; onCreated: (reference: string) => void;
}) {
  const [retry, setRetry] = useState(0);
  const loadKey = `${customerId}:${revision}:${retry}`;
  const [loaded, setLoaded] = useState<{ key: string; orders?: DemoOrder[]; error?: string }>();
  const current = loaded?.key === loadKey ? loaded : undefined;
  const orders = current?.orders;
  const error = current?.error ?? "";
  const setOrders = (update: (rows?: DemoOrder[]) => DemoOrder[] | undefined) => setLoaded((value) => value && { ...value, orders: update(value.orders) });
  const [selected, setSelected] = useState<DemoOrder>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(orderEndpoint("list", String(customerId)), { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.orders)) throw new Error(payload.message ?? "Could not load this customer’s orders.");
      setLoaded({ key: loadKey, orders: payload.orders });
    }).catch((failure) => { if (!controller.signal.aborted) setLoaded({ key: loadKey, error: failure.message }); });
    return () => controller.abort();
  }, [customerId, loadKey]);

  function closeOrder() { detailRequest.current?.abort(); setSelected(undefined); }
  function openOrder(order: DemoOrder) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelected(order); setDetailLoading(true); setDetailError("");
    fetch(orderEndpoint("detail", order.reference), { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || payload.order?.reference !== order.reference) throw new Error(payload.message ?? "Could not load the latest order.");
      if (!controller.signal.aborted) { setSelected(payload.order); setOrders((rows) => rows?.map((row) => row.reference === order.reference ? payload.order : row)); }
    }).catch((failure) => { if (!controller.signal.aborted) setDetailError(failure.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
  }

  return <section className="showroom-customer-orders" aria-label={`${customerName}’s orders`}>
    <div className="showroom-customer-orders-heading">
      <div><h3>Orders</h3><p>Custom and alteration orders for {customerName}.</p></div>
      {canCreate && <CreateStaffOrder category="Custom" preferredCustomerId={customerId} preferredMeasurementId={fittingId} buttonClassName="showroom-primary" buttonLabel="Create order" onCreated={onCreated} />}
    </div>
    {error ? <p role="alert" className="collection-error">{error} <button className="showroom-secondary" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>
      : !orders ? <p role="status" className="showroom-customer-orders-status">Loading orders…</p>
      : !orders.length ? <div className="showroom-empty"><ClipboardList size={44} /><h3>No orders yet.</h3><p>{canCreate ? "Create a custom order once the fitting is agreed. It will appear here and in NY Office." : "Orders created for this customer will appear here."}</p></div>
      : <ul className="showroom-customer-order-list">
        {orders.map((order) => {
          const attention = orderAttention(order);
          return <li key={order.reference}><button type="button" onClick={() => openOrder(order)} aria-label={`View order ${order.reference}`}>
            <span className="showroom-customer-order-main">
              <small>{categoryLabel(order)}{order.service_offering ? ` · ${order.service_offering}` : ""}</small>
              <strong>{order.reference}</strong>
              <span>{order.items.map((item) => item.garment_name).join(" · ")}</span>
            </span>
            <span className="showroom-customer-order-meta">
              <StatusBadge status={attention?.label ?? order.status} tone={attention?.tone} />
              <small>{order.is_complete ? "Completed" : order.expected_completion_date ? `Expected ${orderDate(order.expected_completion_date)}` : "Completion to be agreed"}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button></li>;
        })}
      </ul>}
    {selected && <InventoryDrawer label={`Order ${selected.reference}`} onClose={closeOrder}>
      <div className="showroom-order-details">
        <div className="inventory-form-title"><div><p className="showroom-kicker">{categoryLabel(selected).toUpperCase()}</p><h2>{selected.reference}</h2><p>{selected.customer_name}</p></div><button type="button" aria-label="Close order details" onClick={closeOrder}><X size={20} /></button></div>
        {detailLoading ? <p role="status">Loading the latest order…</p> : detailError ? <p role="alert">{detailError} <button className="inventory-quiet-button" onClick={() => openOrder(selected)}>Retry</button></p> : <OrderDetailsContent order={selected} showWorkspaceLinks={false} onUpdated={(order) => { setSelected(order); setOrders((rows) => rows?.map((row) => row.reference === order.reference ? order : row)); }} />}
      </div>
    </InventoryDrawer>}
  </section>;
}
