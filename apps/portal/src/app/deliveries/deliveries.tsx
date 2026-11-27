"use client";

import { useCallback, useEffect, useState } from "react";
import StaffAccountMenu from "../staff-account-menu";
import { useStaff } from "../staff-context";
import CourierDeliveries, { ReloadButton, dueLabel, type Delivery, type StartPoint } from "./courier-deliveries";
import DeliverySettings, { type Zone } from "./delivery-settings";
import "./deliveries.css";

type Courier = { id: number; name: string };

/**
 * NY Deliveries. A courier gets their phone screen (plan a route, deliver each stop). Owner, general manager and
 * operations manager get the board: every delivery by courier, with its courier and delivery area, plus set-up.
 */
export default function Deliveries({ name }: { name: string }) {
  const staff = useStaff();
  const [deliveries, setDeliveries] = useState<Delivery[]>();
  const [startPoints, setStartPoints] = useState<StartPoint[]>([]);
  const [board, setBoard] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => fetch("/api/staff-deliveries", { cache: "no-store" })
    .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message); setDeliveries(result.deliveries); setStartPoints(result.start_points ?? []); setBoard(Boolean(result.board)); setError(""); })
    .catch((failure) => setError(failure instanceof Error && failure.message ? failure.message : "Couldn’t load deliveries. Check the connection.")), []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    const wake = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", wake);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", wake); };
  }, [load]);

  return <main className={`deliveries${board ? " is-board" : " is-courier"}`}>
    <header className="deliveries-header">
      <div><p className="eyebrow">NY Deliveries</p><h1>{board ? "All deliveries" : `Hello, ${name.split(" ")[0]}`}</h1></div>
      <div className="deliveries-header-actions"><ReloadButton onReload={() => void load()} />{staff && <StaffAccountMenu staff={staff} />}</div>
    </header>
    {error && <p className="collection-error" role="alert">{error}</p>}
    {!deliveries && !error && <div className="deliveries-skeleton" role="status" aria-label="Loading deliveries"><span /><span /><span /></div>}
    {deliveries && (board ? <Board deliveries={deliveries} onChanged={load} /> : <CourierDeliveries deliveries={deliveries} startPoints={startPoints} onChanged={load} />)}
  </main>;
}

function Board({ deliveries, onChanged }: { deliveries: Delivery[]; onChanged: () => Promise<void> }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState(false);

  const loadOptions = useCallback(() => {
    fetch("/api/staff-deliveries/couriers", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).then((result) => setCouriers(result?.couriers ?? [])).catch(() => undefined);
    fetch("/api/staff-deliveries/settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).then((result) => setZones(result?.zones ?? [])).catch(() => undefined);
  }, []);
  useEffect(() => { loadOptions(); }, [loadOptions]);

  const open = deliveries.filter((delivery) => !delivery.delivered_at);
  const done = deliveries.filter((delivery) => delivery.delivered_at);
  const groups = new Map<string, { title: string; items: Delivery[] }>([["none", { title: "No courier yet", items: [] }]]);
  for (const courier of couriers) groups.set(String(courier.id), { title: courier.name, items: [] });
  for (const delivery of open) {
    const key = delivery.courier ? String(delivery.courier.id) : "none";
    if (!groups.has(key)) groups.set(key, { title: delivery.courier?.name ?? "No courier yet", items: [] });
    groups.get(key)!.items.push(delivery);
  }

  return <div className="board">
    <div className="board-bar">
      <p className="production-muted">Every delivery order, by courier. Couriers see only their own and plan their routes on their phones.</p>
      <button type="button" className="inventory-quiet-button" aria-expanded={settings} onClick={() => setSettings((value) => !value)}>{settings ? "Close set-up" : "Areas & shops"}</button>
    </div>
    {settings && <DeliverySettings onChanged={loadOptions} />}
    {[...groups.entries()].filter(([key, group]) => key === "none" || group.items.length).map(([key, group]) => <section key={key} className="board-group">
      <h2>{group.title} <span>{group.items.length}</span></h2>
      {group.items.length ? <div className="board-cards">{group.items.map((delivery) => <BoardCard key={delivery.reference} delivery={delivery} couriers={couriers} zones={zones} onChanged={onChanged} />)}</div>
        : <p className="production-muted">Every delivery has a courier.</p>}
    </section>)}
    {couriers.length === 0 && <p className="production-muted">No delivery couriers on the team yet. Invite one from Team.</p>}
    {done.length > 0 && <section className="board-group"><h2>Delivered this week <span>{done.length}</span></h2>
      <div className="board-cards">{done.map((delivery) => <article key={delivery.reference} className="board-card is-done"><strong>{delivery.recipient_name || delivery.customer.name}</strong><small>{delivery.garments.join(" · ")}</small><small>{delivery.courier?.name ?? ""}</small></article>)}</div></section>}
  </div>;
}

const stageLabel = (delivery: Delivery) => delivery.stage === "out_for_delivery" ? "On the way" : delivery.ready ? "Packed, ready" : "Being prepared";

function BoardCard({ delivery, couriers, zones, onChanged }: { delivery: Delivery; couriers: Courier[]; zones: Zone[]; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const due = dueLabel(delivery.due_by);
  const zoneId = zones.find((zone) => zone.name === delivery.zone)?.id ?? "";

  async function save(path: string, body: object, fallback: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/staff-deliveries/orders/${encodeURIComponent(delivery.reference)}${path}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || fallback);
      await onChanged();
    } catch (failure) { setError(failure instanceof Error ? failure.message : fallback); } finally { setBusy(false); }
  }

  return <article className="board-card">
    <div className="board-card-top"><div><strong>{delivery.recipient_name || delivery.customer.name}</strong><small>{delivery.reference}</small></div>
      <span className="delivery-status" data-stage={delivery.stage}>{stageLabel(delivery)}</span></div>
    <small>{delivery.garments.join(" · ")}</small>
    <small>{[delivery.address, delivery.area].filter(Boolean).join(", ") || "No address yet"}{delivery.latitude === null ? " · no map pin" : ""}</small>
    {due && <em className="board-due" data-tone={due.tone}>{due.text}{delivery.zone ? ` · ${delivery.zone}` : ""}</em>}
    <div className="board-card-fields">
      <label>Courier<select value={delivery.courier?.id ?? ""} disabled={busy || delivery.stage === "out_for_delivery"} onChange={(event) => void save("", { courier_id: event.target.value ? Number(event.target.value) : null }, "Couldn’t assign the courier.")}>
        <option value="">Not assigned</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}</select></label>
      <label>Delivery area<select value={zoneId} disabled={busy} onChange={(event) => void save("/zone", { zone_id: event.target.value ? Number(event.target.value) : null }, "Couldn’t set the area.")}>
        <option value="">{zones.length ? "Choose area" : "Add areas first"}</option>{zones.filter((zone) => zone.active || zone.id === zoneId).map((zone) => <option key={zone.id} value={zone.id}>{zone.name} ({zone.label})</option>)}</select></label>
    </div>
    {error && <p className="collection-error" role="alert">{error}</p>}
  </article>;
}
