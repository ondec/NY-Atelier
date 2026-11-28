"use client";

import { useEffect, useState } from "react";
import type { DemoOrder } from "@/lib/orders";
import { can } from "@/lib/staff-permissions";
import { useStaff } from "./staff-context";

type Courier = { id: number; name: string };

/** A delivery order is given to one delivery courier, who sees it in Deliveries and confirms the handover. */
export default function OrderCourier({ order, onChange }: { order: DemoOrder; onChange: (order: DemoOrder) => void }) {
  const staff = useStaff();
  const [couriers, setCouriers] = useState<Courier[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = order.can_dispatch ?? can(staff, "orders.manage");

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    fetch("/api/staff-deliveries/couriers", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined)
      .then((result) => { if (active) setCouriers(result?.couriers ?? []); }).catch(() => { if (active) setCouriers([]); });
    return () => { active = false; };
  }, [allowed]);

  async function assign(value: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/staff-deliveries/orders/${encodeURIComponent(order.reference)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courier_id: value ? Number(value) : null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Could not assign the courier.");
      onChange(result.order);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not assign the courier."); } finally { setBusy(false); }
  }

  if (order.fulfilment_method !== "Delivery" || order.is_complete) return null;
  const current = order.assigned_courier;

  return <section className="panel order-detail-section" aria-label="Delivery courier">
    <div className="order-section-heading"><div><p className="eyebrow">DELIVERY</p><h2>Courier</h2></div></div>
    {order.delivery_status && <p className={`order-delivery-status is-${order.delivery_status.key}`} role="status">{order.delivery_status.label}{order.delivery_status.courier ? ` · ${order.delivery_status.courier}` : ""}</p>}
    {allowed ? <>
      <label className="order-courier-select">Delivered by
        <select value={current?.id ?? ""} disabled={busy || couriers === undefined} onChange={(event) => void assign(event.target.value)}>
          <option value="">{couriers?.length === 0 ? "No couriers on the team yet" : "Not assigned"}</option>
          {current && !couriers?.some((courier) => courier.id === current.id) && <option value={current.id}>{current.name}</option>}
          {couriers?.map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}
        </select>
      </label>
      <p className="order-journey-help">The courier sees the address, phone and garments in Deliveries, and confirms when it’s handed over.</p>
    </> : <p className="order-journey-help">{current ? `${current.name} will deliver this order.` : "The operations manager will send this out with a courier. Keep it packed and ready at the front desk."}</p>}
    {error && <p className="collection-error" role="alert">{error}</p>}
  </section>;
}
