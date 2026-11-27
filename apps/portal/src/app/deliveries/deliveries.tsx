"use client";

import { useCallback, useEffect, useState } from "react";
import StaffAccountMenu from "../staff-account-menu";
import { useStaff } from "../staff-context";
import CourierDeliveries, { ReloadButton, dueLabel, orderType, type Delivery, type StartPoint } from "./courier-deliveries";
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

type Filter = "all" | "unassigned" | "urgent" | "ready" | "road";
const isUrgent = (delivery: Delivery) => { const tone = dueLabel(delivery.due_by)?.tone; return tone === "late" || tone === "today"; };
const matches: Record<Filter, (delivery: Delivery) => boolean> = {
  all: () => true,
  unassigned: (delivery) => !delivery.courier,
  urgent: isUrgent,
  ready: (delivery) => delivery.ready && delivery.stage !== "out_for_delivery",
  road: (delivery) => delivery.stage === "out_for_delivery",
};
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

function Board({ deliveries, onChanged }: { deliveries: Delivery[]; onChanged: () => Promise<void> }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);

  const loadOptions = useCallback(() => {
    fetch("/api/staff-deliveries/couriers", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).then((result) => setCouriers(result?.couriers ?? [])).catch(() => undefined);
    fetch("/api/staff-deliveries/settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : undefined).then((result) => setZones(result?.zones ?? [])).catch(() => undefined);
  }, []);
  useEffect(() => { loadOptions(); }, [loadOptions]);
  useEffect(() => {
    if (!settings) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setSettings(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [settings]);

  const open = deliveries.filter((delivery) => !delivery.delivered_at);
  const done = deliveries.filter((delivery) => delivery.delivered_at);
  const text = query.trim().toLowerCase();
  const shown = open.filter((delivery) => matches[filter](delivery) && (!text || [delivery.recipient_name, delivery.customer.name, delivery.reference, delivery.address, delivery.area, delivery.zone]
    .some((value) => value?.toLowerCase().includes(text))));

  const groups = new Map<string, { title: string; courier: boolean; items: Delivery[] }>([["none", { title: "Needs a courier", courier: false, items: [] }]]);
  for (const courier of couriers) groups.set(String(courier.id), { title: courier.name, courier: true, items: [] });
  for (const delivery of shown) {
    const key = delivery.courier ? String(delivery.courier.id) : "none";
    if (!groups.has(key)) groups.set(key, { title: delivery.courier?.name ?? "Needs a courier", courier: true, items: [] });
    groups.get(key)!.items.push(delivery);
  }
  const lanes = [...groups.entries()].filter(([, group]) => group.items.length);

  const stats: { key: Filter; label: string; value: number; tone?: string }[] = [
    { key: "unassigned", label: "Need a courier", value: open.filter(matches.unassigned).length, tone: "warn" },
    { key: "urgent", label: "Due today or late", value: open.filter(matches.urgent).length, tone: "late" },
    { key: "ready", label: "Packed, ready to go", value: open.filter(matches.ready).length },
    { key: "road", label: "On the way", value: open.filter(matches.road).length, tone: "road" },
  ];
  const filters: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "unassigned", label: "Needs courier" }, { key: "urgent", label: "Today & late" }, { key: "ready", label: "Ready" }, { key: "road", label: "On the way" }];

  return <div className="board">
    <section className="board-stats" aria-label="Summary">
      {stats.map((stat) => <button key={stat.key} type="button" className="board-stat" data-tone={stat.value ? stat.tone : undefined} aria-pressed={filter === stat.key}
        onClick={() => setFilter(filter === stat.key ? "all" : stat.key)}><strong>{stat.value}</strong><span>{stat.label}</span></button>)}
      <div className="board-stat is-quiet"><strong>{done.length}</strong><span>Delivered this week</span></div>
    </section>

    <div className="board-toolbar">
      <label className="board-search"><span className="sr-only">Search deliveries</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, order or area" /></label>
      <div className="board-filters" role="group" aria-label="Show">
        {filters.map((item) => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>
      <button type="button" className="board-setup" onClick={() => setSettings(true)} aria-haspopup="dialog">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></svg>
        Areas & shops</button>
    </div>

    {lanes.length === 0 && <div className="board-empty"><strong>{open.length ? "Nothing matches" : "No deliveries waiting"}</strong><span>{open.length ? "Try another filter or search." : "New delivery orders appear here as soon as they are placed."}</span>
      {open.length > 0 && <button type="button" onClick={() => { setFilter("all"); setQuery(""); }}>Show all</button>}</div>}

    {lanes.map(([key, group]) => {
      const road = group.items.filter(matches.road).length; const ready = group.items.filter(matches.ready).length; const urgent = group.items.filter(matches.urgent).length;
      return <section key={key} className={`board-lane${group.courier ? "" : " is-unassigned"}`} aria-label={group.title}>
        <header className="board-lane-head">
          <span className="board-avatar" aria-hidden="true">{group.courier ? initials(group.title) : "!"}</span>
          <div><h2>{group.title}</h2>
            <p>{group.items.length} {group.items.length === 1 ? "delivery" : "deliveries"}{road ? ` · ${road} on the way` : ""}{ready ? ` · ${ready} ready` : ""}</p></div>
          {urgent > 0 && <span className="board-lane-flag">{urgent} due today or late</span>}
        </header>
        <div className="board-rows">{group.items.map((delivery) => <BoardRow key={delivery.reference} delivery={delivery} couriers={couriers} zones={zones} onChanged={onChanged} />)}</div>
      </section>;
    })}

    {couriers.length === 0 && <p className="production-muted">No delivery couriers on the team yet. Invite one from Team.</p>}

    {done.length > 0 && <section className="board-lane is-done">
      <button type="button" className="board-done-toggle" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)}>
        <span>Delivered this week <em>{done.length}</em></span><span aria-hidden="true">{showDone ? "Hide" : "Show"}</span></button>
      {showDone && <div className="board-rows">{done.map((delivery) => <div key={delivery.reference} className="board-row is-done">
        <div className="board-who"><i className="board-dot" data-stage="delivered" /><div><strong>{delivery.recipient_name || delivery.customer.name}</strong><small>{delivery.reference} · {orderType(delivery)}</small></div></div>
        <div className="board-where">{[delivery.address, delivery.area].filter(Boolean).join(", ")}</div>
        <div className="board-done-meta">{delivery.courier?.name ?? ""}{delivery.delivered_at ? ` · ${new Date(delivery.delivered_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}` : ""}</div>
      </div>)}</div>}
    </section>}

    {settings && <div className="board-drawer-layer">
      <button type="button" className="board-drawer-backdrop" aria-label="Close" onClick={() => setSettings(false)} />
      <aside className="board-drawer" role="dialog" aria-modal="true" aria-label="Areas and shops">
        <header><div><p className="eyebrow">Set-up</p><h2>Areas & shops</h2></div><button type="button" className="board-drawer-close" aria-label="Close" onClick={() => setSettings(false)}>×</button></header>
        <DeliverySettings onChanged={loadOptions} />
      </aside>
    </div>}
  </div>;
}

const stageLabel = (delivery: Delivery) => delivery.stage === "out_for_delivery" ? "On the way" : delivery.ready ? "Ready" : "Preparing";
const stageKey = (delivery: Delivery) => delivery.stage === "out_for_delivery" ? "road" : delivery.ready ? "ready" : "preparing";

function BoardRow({ delivery, couriers, zones, onChanged }: { delivery: Delivery; couriers: Courier[]; zones: Zone[]; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const due = dueLabel(delivery.due_by);
  const zoneId = zones.find((zone) => zone.name === delivery.zone)?.id ?? "";
  const onRoad = delivery.stage === "out_for_delivery";

  async function save(path: string, body: object, fallback: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/staff-deliveries/orders/${encodeURIComponent(delivery.reference)}${path}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || fallback);
      await onChanged();
    } catch (failure) { setError(failure instanceof Error ? failure.message : fallback); } finally { setBusy(false); }
  }

  return <article className={`board-row${busy ? " is-busy" : ""}`}>
    <div className="board-who">
      <i className="board-dot" data-stage={stageKey(delivery)} aria-hidden="true" />
      <div><strong>{delivery.recipient_name || delivery.customer.name}</strong>
        <small>{delivery.reference} · {orderType(delivery)}{delivery.garments.length ? ` · ${delivery.garments.length} ${delivery.garments.length === 1 ? "item" : "items"}` : ""}</small></div>
    </div>
    <div className="board-where">
      <span>{[delivery.address, delivery.area].filter(Boolean).join(", ") || "No address yet"}</span>
      {delivery.latitude === null && <small className="board-warn">No map pin</small>}
    </div>
    <div className="board-tags">
      <span className="board-stage" data-stage={stageKey(delivery)}>{stageLabel(delivery)}</span>
      {due && <span className="board-due" data-tone={due.tone}>{due.text}</span>}
    </div>
    <div className="board-pickers">
      <label><span className="sr-only">Courier for {delivery.reference}</span>
        <select value={delivery.courier?.id ?? ""} disabled={busy || onRoad} title={onRoad ? "Already on the way" : "Courier"} onChange={(event) => void save("", { courier_id: event.target.value ? Number(event.target.value) : null }, "Couldn’t assign the courier.")}>
          <option value="">No courier</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}</select></label>
      <label><span className="sr-only">Delivery area for {delivery.reference}</span>
        <select value={zoneId} disabled={busy} data-empty={zoneId === "" || undefined} title="Delivery area" onChange={(event) => void save("/zone", { zone_id: event.target.value ? Number(event.target.value) : null }, "Couldn’t set the area.")}>
          <option value="">{zones.length ? "Choose area" : "Add areas first"}</option>{zones.filter((zone) => zone.active || zone.id === zoneId).map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {zone.label}</option>)}</select></label>
    </div>
    {error && <p className="collection-error board-row-error" role="alert">{error}</p>}
  </article>;
}
