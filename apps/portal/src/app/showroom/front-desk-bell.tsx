"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, X } from "@/components/icons";
import { orderDate } from "../order-table";
import { useStaff } from "../staff-context";

type Alert = { reference: string; category?: string; store?: "atelier" | "rtw_store"; kind: "packed" | "returned" | "to_package" | "delivered"; customer_id: number; customer_name: string; garments: string[]; fulfilment_method: string | null; reason: string | null; arrived_at: string | null };
type Alerts = { alerts: Alert[]; seen_at: string | null };

const ago = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60000));
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.round(minutes / 60)} h ago` : orderDate(value.slice(0, 10));
};

/**
 * NY Studio's front-desk notifications: orders production has packed and handed back (arrange collection or
 * delivery), and orders production sent back with a reason. The same events go to the shared order mailbox.
 */
export default function FrontDeskBell({ onOpen }: { onOpen: (customerId: number) => void }) {
  const location = useStaff()?.location;
  const [rawData, setData] = useState<Alerts>();
  // A receptionist sees only their own store's hand-offs.
  const data = useMemo(() => rawData && location ? { ...rawData, alerts: rawData.alerts.filter((alert) => (alert.store ?? (alert.category === "Ready-to-Wear" ? "rtw_store" : "atelier")) === location) } : rawData, [rawData, location]);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Alert[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => fetch("/api/studio/records/front-desk/alerts", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined)
      .then((result) => { if (active && result?.alerts) setData(result); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const seen = data?.seen_at ? Date.parse(data.seen_at) : 0;
  const fresh = useMemo(() => (data?.alerts ?? []).filter((alert) => alert.arrived_at && Date.parse(alert.arrived_at) > seen), [data, seen]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = fresh.length ? `(${fresh.length}) ${base}` : base;
  }, [fresh.length]);

  function toggle() {
    if (open) { setOpen(false); return; }
    setShown(data?.alerts ?? []); setOpen(true);
    if (fresh.length) fetch("/api/studio/records/front-desk/seen", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((result) => { if (result?.seen_at) setData((current) => current && { ...current, seen_at: result.seen_at }); }).catch(() => undefined);
  }

  return <div className="production-bell">
    <button type="button" className="production-bell-button" aria-expanded={open} aria-label={`Notifications${fresh.length ? `, ${fresh.length} new` : ""}`} onClick={toggle}>
      <Bell size={19} />{fresh.length > 0 && <span className="production-bell-count">{fresh.length > 9 ? "9+" : fresh.length}</span>}
    </button>
    {open && <div className="production-bell-panel" role="dialog" aria-label="Notifications">
      <div className="production-bell-heading"><strong>Order updates</strong><button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={16} /></button></div>
      {shown.length ? <ul>{shown.map((alert) => <li key={`${alert.kind}-${alert.reference}`}><button type="button" onClick={() => { setOpen(false); onOpen(alert.customer_id); }}>
        <span><strong>{alert.customer_name}</strong><small>{alert.garments.join(" · ")}</small>
          <small>{alert.kind === "packed" ? `Packed · arrange ${alert.fulfilment_method === "Delivery" ? "delivery" : "collection"}` : alert.kind === "delivered" ? "Delivered by the courier" : alert.kind === "to_package" ? `Not packaged · package it, then arrange ${alert.fulfilment_method === "Delivery" ? "delivery" : "collection"}` : `Sent back: ${alert.reason ?? ""}`}{alert.arrived_at ? ` · ${ago(alert.arrived_at)}` : ""}</small></span><ChevronRight size={16} />
      </button></li>)}</ul> : <p className="production-muted">Nothing waiting. Orders appear here when production packs them or sends them back.</p>}
    </div>}
  </div>;
}
