"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, ChevronDown, LoaderCircle, Plus, RefreshCw, TriangleAlert } from "@/components/icons";
import { createRequestId } from "@/lib/request-id";
import { googleDirections, googleRouteParts, googleStopLimit, type Point, type RouteStop } from "./route-map";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false, loading: () => <div className="route-map route-map-loading" aria-hidden="true" /> });

export type Delivery = {
  reference: string; stage: string; status: string; can_deliver: boolean; ready: boolean; delivered_at: string | null;
  customer: { name: string; phone: string | null }; recipient_name: string | null; phone: string | null;
  address: string | null; area: string | null; gps_code: string | null; directions: string | null;
  latitude: number | null; longitude: number | null; instructions: string | null; garments: string[];
  category: string; courier: { id: number; name: string } | null; zone: string | null; due_from: string | null; due_by: string | null;
};
export type StartPoint = { id: number; name: string; address: string | null; latitude: number; longitude: number };
type Shop = StartPoint;
/** What the courier set off with: stop order (with `pickup` for a shop collection), the pick-up shop and its orders, and where to finish. */
type SavedRoute = { order: string[]; pickup: Shop | null; waiting: string[]; finish: Shop | null };
const readSaved = (): SavedRoute => {
  try { const value = JSON.parse(store.get(orderKey) ?? "[]"); return Array.isArray(value) ? { order: value, pickup: null, waiting: [], finish: null } : { order: [], pickup: null, waiting: [], finish: null, ...value }; }
  catch { return { order: [], pickup: null, waiting: [], finish: null }; }
};
const shopStop = (shop: Shop, variant: "pickup" | "finish"): RouteStop => ({ key: variant, label: `${variant === "pickup" ? "Pick up at" : "Finish at"} ${shop.name}`, latitude: shop.latitude, longitude: shop.longitude, marker: variant === "pickup" ? "P" : "⚑", variant });
type Route = { order: string[]; legs: { distance_m: number; duration_s: number }[]; distance_m: number | null; duration_s: number | null; path: [number, number][]; estimated: boolean; unmapped: string[] };
type Tab = "plan" | "road" | "done";
type Due = "today" | "soon" | "all";
type Start = { kind: "shop"; id: number } | { kind: "here" } | { kind: "pin" };

const orderKey = "ny-delivery-route-order";
const startKey = "ny-delivery-route-start";
const store = { get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } }, set: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } } };

const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
export function dueLabel(dueBy: string | null) {
  if (!dueBy) return undefined;
  const today = localDate();
  if (dueBy < today) return { text: "Overdue", tone: "late" };
  if (dueBy === today) return { text: "Due today", tone: "today" };
  if (dueBy === localDate(1)) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due ${new Date(`${dueBy}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`, tone: "later" };
}
const km = (metres: number | null) => metres === null ? "" : metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`;
const minutes = (seconds: number | null) => { if (!seconds) return ""; const total = Math.round(seconds / 60); return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`; };
const pinned = (delivery: Delivery): delivery is Delivery & Point => delivery.latitude !== null && delivery.longitude !== null;
export const orderType = (delivery: Delivery) => delivery.category === "Ready-to-Wear" ? "Ready-to-Wear" : delivery.category === "Alterations" ? "Alteration" : delivery.category === "Atelier" || delivery.category === "Custom" ? "Custom" : delivery.category;
const name = (delivery: Delivery) => delivery.recipient_name || delivery.customer.name;

/**
 * A courier's phone screen. Plan: choose which ready deliveries to take and where to start, and see the shortest road
 * route on the map (it recalculates whenever a stop or the start changes). Start route sends them all out for delivery
 * and tells each customer. On the way: the stops in route order, each with call, navigate and delivered.
 */
export default function CourierDeliveries({ deliveries, startPoints, onChanged }: { deliveries: Delivery[]; startPoints: StartPoint[]; onChanged: () => Promise<void> }) {
  const ready = useMemo(() => deliveries.filter((delivery) => delivery.ready && !delivery.delivered_at), [deliveries]);
  const onRoad = useMemo(() => deliveries.filter((delivery) => delivery.can_deliver), [deliveries]);
  const done = useMemo(() => deliveries.filter((delivery) => delivery.delivered_at), [deliveries]);
  const coming = useMemo(() => deliveries.filter((delivery) => !delivery.ready && !delivery.can_deliver && !delivery.delivered_at), [deliveries]);
  const [tab, setTab] = useState<Tab>(() => onRoad.length && !ready.length ? "road" : "plan");

  return <>
    <nav className="courier-tabs" aria-label="Deliveries">
      {([["plan", "Plan", ready.length], ["road", "On the way", onRoad.length], ["done", "Done", done.length]] as const).map(([id, label, count]) =>
        <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}{count > 0 && <span>{count}</span>}</button>)}
    </nav>
    {tab === "plan" && <PlanRoute ready={ready} onRoad={onRoad} coming={coming} startPoints={startPoints} onStarted={async () => { await onChanged(); setTab("road"); }} />}
    {tab === "road" && <OnTheWay deliveries={onRoad} startPoints={startPoints} onChanged={onChanged} onAddStops={() => setTab("plan")} readyCount={ready.length} />}
    {tab === "done" && (done.length ? <ul className="courier-list">{done.map((delivery) => <li key={delivery.reference} className="courier-stop is-done">
      <div className="courier-stop-main"><span className="courier-stop-number"><Check size={15} /></span><div><strong>{name(delivery)}</strong><small><b className="courier-type">{orderType(delivery)}</b> {delivery.garments.join(" · ")}</small>
        <small>Delivered {delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}</small></div></div>
    </li>)}</ul> : <p className="courier-empty">Nothing delivered in the last week yet.</p>)}
  </>;
}

function PlanRoute({ ready, onRoad, coming, startPoints, onStarted }: { ready: Delivery[]; onRoad: Delivery[]; coming: Delivery[]; startPoints: StartPoint[]; onStarted: () => Promise<void> }) {
  const today = localDate(); const soon = localDate(5);
  const counts = { today: ready.filter((delivery) => delivery.due_by && delivery.due_by <= today).length, soon: ready.filter((delivery) => delivery.due_by && delivery.due_by <= soon).length, all: ready.length };
  const [due, setDue] = useState<Due>(() => counts.today ? "today" : counts.soon ? "soon" : "all");
  const shown = useMemo(() => ready.filter((delivery) => due === "all" || (delivery.due_by !== null && delivery.due_by <= (due === "today" ? today : soon))), [ready, due, today, soon]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shown.map((delivery) => delivery.reference)));
  const [start, setStart] = useState<Start>(() => {
    const saved = Number(store.get(startKey));
    if (onRoad.length) return { kind: "here" };
    return startPoints.some((point) => point.id === saved) ? { kind: "shop", id: saved } : startPoints[0] ? { kind: "shop", id: startPoints[0].id } : { kind: "here" };
  });
  const [here, setHere] = useState<Point>();
  const [pin, setPin] = useState<Point>();
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [finishId, setFinishId] = useState<number | null>(null);
  const pickupShop = pickupId ? startPoints.find((point) => point.id === pickupId) ?? null : null;
  const finishShop = finishId ? startPoints.find((point) => point.id === finishId) ?? null : null;
  const [locating, setLocating] = useState(false);
  const [sheet, setSheet] = useState<"options" | null>(null);
  const startLabel = start.kind === "shop" ? startPoints.find((point) => point.id === start.id)?.name ?? "Choose" : start.kind === "here" ? (locating ? "Finding you…" : "My location") : "Dropped pin";
  const optionsSet = pickupId !== null || finishId !== null || start.kind !== "shop";
  const [planned, setRoute] = useState<Route>();
  const [routing, setRouting] = useState(false);
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const [showComing, setShowComing] = useState(false);
  const routeRequest = useRef(0);

  function chooseDue(next: Due) {
    setDue(next);
    setSelected(new Set(ready.filter((delivery) => next === "all" || (delivery.due_by !== null && delivery.due_by <= (next === "today" ? today : soon))).map((delivery) => delivery.reference)));
  }
  const toggle = (reference: string) => setSelected((current) => { const next = new Set(current); if (next.has(reference)) next.delete(reference); else next.add(reference); return next; });
  const allShown = shown.length > 0 && shown.every((delivery) => selected.has(delivery.reference));

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) { setMessage("This phone can’t share its location. Choose a shop or drop a pin."); return; }
    setLocating(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => { setHere({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setMessage("Location is off. Allow location for this site, or choose a shop or drop a pin."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }, []);

  // Adding to a route already under way starts from where the courier is now.
  useEffect(() => { if (start.kind === "here" && !here) { const timer = window.setTimeout(locate, 0); return () => window.clearTimeout(timer); } },
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const startPoint: Point | undefined = start.kind === "shop" ? startPoints.find((point) => point.id === start.id) : start.kind === "here" ? here : pin;
  const chosen = useMemo(() => ready.filter((delivery) => selected.has(delivery.reference)), [ready, selected]);
  // Stops already on the way stay on the route; new ones are added around them.
  const routed = useMemo(() => [...onRoad, ...chosen], [onRoad, chosen]);
  const chosenKey = routed.map((delivery) => delivery.reference).join(",");

  useEffect(() => {
    if (!startPoint || !routed.length) { routeRequest.current++; return; }
    const request = ++routeRequest.current;
    const timer = window.setTimeout(async () => {
      setRouting(true);
      try {
        const response = await fetch("/api/staff-deliveries/route", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start: { latitude: startPoint.latitude, longitude: startPoint.longitude }, references: routed.map((delivery) => delivery.reference),
            pickup_point_id: pickupId, pickup_references: pickupId ? chosen.map((delivery) => delivery.reference) : [], finish_point_id: finishId }) });
        const result = await response.json().catch(() => ({}));
        if (request !== routeRequest.current) return;
        if (!response.ok) throw new Error(result.message || "Couldn’t plan the route.");
        setRoute(result.route); setMessage("");
      } catch (failure) { if (request === routeRequest.current) { setRoute(undefined); setMessage(failure instanceof Error ? failure.message : "Couldn’t plan the route."); } }
      finally { if (request === routeRequest.current) setRouting(false); }
    }, 450);
    return () => window.clearTimeout(timer);
    // Recalculate when the chosen stops or the start move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenKey, startPoint?.latitude, startPoint?.longitude, pickupId, finishId]);

  // A route only counts while there is a start and something chosen.
  const route = startPoint && routed.length ? planned : undefined;
  const byReference = new Map(routed.map((delivery) => [delivery.reference, delivery]));
  const toStop = (delivery: Delivery): RouteStop => ({ key: delivery.reference, label: name(delivery), latitude: delivery.latitude!, longitude: delivery.longitude! });
  const stops: RouteStop[] = route
    ? route.order.flatMap((key) => key === "pickup" ? (pickupShop ? [shopStop(pickupShop, "pickup")] : []) : [byReference.get(key)].filter((delivery): delivery is Delivery => Boolean(delivery && pinned(delivery))).map(toStop))
    : routed.filter(pinned).map(toStop);
  const mapStops = finishShop && route ? [...stops, shopStop(finishShop, "finish")] : stops;
  const unmapped = routed.filter((delivery) => !pinned(delivery));
  const position = new Map(route?.order.filter((key) => key !== "pickup").map((reference, index) => [reference, index + 1]));

  const parts = googleRouteParts(startPoint, mapStops);

  async function startRoute() {
    if (!chosen.length || starting) return;
    setStarting(true); setMessage("");
    const planOrder = [...(route?.order ?? []), ...routed.filter((delivery) => !route?.order.includes(delivery.reference)).map((delivery) => delivery.reference)];
    const references = planOrder.filter((key) => key !== "pickup");
    try {
      const response = await fetch("/api/staff-deliveries/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Couldn’t start the route.");
      store.set(orderKey, JSON.stringify({ order: planOrder, pickup: pickupShop, waiting: pickupShop ? chosen.map((delivery) => delivery.reference) : [], finish: finishShop } satisfies SavedRoute));
      if (startPoint) store.set(`${startKey}-point`, JSON.stringify(startPoint));
      await onStarted();
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "Couldn’t start the route."); setStarting(false); }
  }

  const adding = onRoad.length > 0;

  if (!ready.length) return <div className="courier-plan">
    <p className="courier-empty"><strong>Nothing ready to deliver.</strong> Packed orders the front desk gives you appear here.</p>
    {coming.length > 0 && <ComingUp coming={coming} open onToggle={() => undefined} />}
  </div>;

  return <div className="courier-plan">
    {adding && <p className="courier-pill-note">{onRoad.length} on the way · tick new orders to add</p>}

    <div className="courier-map-wrap">
      <RouteMap start={startPoint} stops={mapStops} path={route?.path} onPickStart={start.kind === "pin" ? setPin : undefined} />
      <div className="courier-map-controls">
        {startPoints.length > 0 && <button type="button" className="courier-filter-button" aria-haspopup="dialog" aria-label={`Route options. Starting from ${startLabel}`} title="Route options" onClick={() => setSheet("options")}>
          <FilterIcon />{optionsSet && <i aria-hidden="true" />}
        </button>}
      </div>
      {start.kind === "pin" && <span className="courier-map-hint">{pin ? "Tap the map to move the start" : "Tap the map where you start"}</span>}
      {routing && <span className="courier-map-status"><LoaderCircle size={15} className="spin" />Planning route…</span>}
    </div>

    {sheet === "options" && <Sheet title="Route options" onClose={() => setSheet(null)}>
      <h3 className="sheet-label">Start from</h3>
      <div className="sheet-options" role="radiogroup" aria-label="Start of route">
        {startPoints.map((point) => <SheetOption key={point.id} checked={start.kind === "shop" && start.id === point.id} label={point.name}
          onPick={() => { setStart({ kind: "shop", id: point.id }); store.set(startKey, String(point.id)); }} />)}
        <SheetOption checked={start.kind === "here"} label={locating ? "Finding you…" : "My location"} detail="Where your phone is now"
          onPick={() => { setStart({ kind: "here" }); if (!here) locate(); }} />
        <SheetOption checked={start.kind === "pin"} label="Drop a pin" detail="Close this, then tap the map"
          onPick={() => { setStart({ kind: "pin" }); setSheet(null); }} />
      </div>
      {adding && <>
        <h3 className="sheet-label">Pick up new orders from</h3>
        <div className="sheet-options" role="radiogroup" aria-label="Pick up from">
          <SheetOption checked={pickupId === null} label="Already with me" onPick={() => setPickupId(null)} />
          {startPoints.map((point) => <SheetOption key={point.id} checked={pickupId === point.id} label={point.name} onPick={() => setPickupId(point.id)} />)}
        </div>
        {pickupShop && <p className="courier-hint">You stop at {pickupShop.name} before the new orders.</p>}
      </>}
      <h3 className="sheet-label">Finish at</h3>
      <div className="sheet-options" role="radiogroup" aria-label="Finish at">
        <SheetOption checked={finishId === null} label="Last stop" onPick={() => setFinishId(null)} />
        {startPoints.map((point) => <SheetOption key={point.id} checked={finishId === point.id} label={point.name} onPick={() => setFinishId(point.id)} />)}
      </div>
      <button type="button" className="sheet-done" onClick={() => setSheet(null)}>Done</button>
    </Sheet>}

    {route && stops.length > 0 && <div className="courier-summary" role="status">
      <div><strong>{stops.filter((stop) => !stop.variant).length}</strong><span>{stops.filter((stop) => !stop.variant).length === 1 ? "stop" : "stops"}</span></div>
      {route.distance_m !== null && <div><strong>{km(route.distance_m)}</strong><span>distance</span></div>}
      {route.duration_s ? <div><strong>{minutes(route.duration_s)}</strong><span>driving</span></div> : null}
    </div>}
    {parts.length > 1 && <section className="courier-card courier-google" aria-label="Open in Google Maps">
      <h2 className="courier-card-title">Drive with Google Maps</h2>
      <p className="courier-hint">Google Maps takes up to {googleStopLimit} stops at a time, so this route is in {parts.length} parts. Open the next part when you finish one; each starts where the last ended.</p>
      {parts.map((part, index) => <a key={part.from} className="courier-wide-link" href={part.href} target="_blank" rel="noreferrer">Part {index + 1}: stops {part.from}–{part.to}<ArrowUpRight size={16} /></a>)}
    </section>}
    {route?.estimated && <p className="courier-notice"><TriangleAlert size={16} />Road routing is unavailable, so stops are ordered by straight-line distance.</p>}
    {unmapped.length > 0 && <p className="courier-notice"><TriangleAlert size={16} />{unmapped.length === 1 ? "1 stop has" : `${unmapped.length} stops have`} no map pin, so {unmapped.length === 1 ? "it isn’t" : "they aren’t"} on the route. Check the address.</p>}
    {message && <p className="collection-error" role="alert">{message}</p>}

    <section aria-label="Ready to deliver">
      <div className="courier-list-head">
        <div className="courier-segment" role="radiogroup" aria-label="Which deliveries">
          {([["today", "Today", counts.today], ["soon", "Next 5 days", counts.soon], ["all", "All ready", counts.all]] as const).map(([id, label, count]) =>
            <button key={id} type="button" role="radio" aria-checked={due === id} onClick={() => chooseDue(id)}>{label} <span>{count}</span></button>)}
        </div>
        {shown.length > 0 && <button type="button" className="courier-link" onClick={() => setSelected((current) => {
          const next = new Set(current); shown.forEach((delivery) => allShown ? next.delete(delivery.reference) : next.add(delivery.reference)); return next;
        })}>{allShown ? "Clear all" : "Select all"}</button>}
      </div>
      {shown.length ? <ul className="courier-list">{[...shown].sort((a, b) => (position.get(a.reference) ?? 999) - (position.get(b.reference) ?? 999)).map((delivery) => {
        const label = dueLabel(delivery.due_by); const checked = selected.has(delivery.reference); const number = position.get(delivery.reference);
        return <li key={delivery.reference}><label className={`courier-stop is-selectable${checked ? " is-selected" : ""}`}>
          <input type="checkbox" checked={checked} onChange={() => toggle(delivery.reference)} />
          <span className="courier-stop-number" aria-hidden="true">{checked ? number ?? <Check size={15} /> : ""}</span>
          <span className="courier-stop-body">
            <span className="courier-stop-top"><strong>{name(delivery)}</strong>{label && <em data-tone={label.tone}>{label.text}</em>}</span>
            <small>{[delivery.address, delivery.area].filter(Boolean).join(", ") || "No address yet"}</small>
            <small><b className="courier-type">{orderType(delivery)}</b> {delivery.garments.join(" · ")}</small>
            {!pinned(delivery) && <small className="courier-warn">No map pin</small>}
          </span>
        </label></li>;
      })}</ul> : <p className="courier-empty">Nothing due {due === "today" ? "today" : "in the next 5 days"}. Try “All ready”.</p>}
    </section>

    {coming.length > 0 && <ComingUp coming={coming} open={showComing} onToggle={() => setShowComing((value) => !value)} />}

    <div className="courier-dock">
      <a className={`courier-dock-secondary${stops.length ? "" : " is-disabled"}`} href={parts[0]?.href} target="_blank" rel="noreferrer" aria-disabled={!stops.length}>
        {parts.length > 1 ? "Part 1" : "Google Maps"}<ArrowUpRight size={16} /></a>
      <button type="button" className="courier-dock-primary" disabled={!chosen.length || starting || routing} onClick={() => void startRoute()}>
        {starting ? "Saving…" : `${adding ? "Add to route" : "Start route"}${chosen.length ? ` · ${chosen.length}` : ""}`}</button>
    </div>
    <p className="courier-hint courier-dock-note">{adding ? "Adding tells each new customer their order is on the way." : "Starting tells each customer their order is on the way."}</p>
  </div>;
}

function ComingUp({ coming, open, onToggle }: { coming: Delivery[]; open: boolean; onToggle: () => void }) {
  return <section className="courier-coming">
    <button type="button" className="courier-coming-toggle" aria-expanded={open} onClick={onToggle}>Being prepared <span>{coming.length}</span><ChevronDown size={16} /></button>
    {open && <ul className="courier-list">{coming.map((delivery) => { const label = dueLabel(delivery.due_by); return <li key={delivery.reference} className="courier-stop is-muted">
      <span className="courier-stop-body"><span className="courier-stop-top"><strong>{name(delivery)}</strong>{label && <em data-tone={label.tone}>{label.text}</em>}</span>
        <small><b className="courier-type">{orderType(delivery)}</b> {delivery.garments.join(" · ")}</small><small>Not packed yet</small></span>
    </li>; })}</ul>}
  </section>;
}

function OnTheWay({ deliveries, startPoints, onChanged, onAddStops, readyCount }: { deliveries: Delivery[]; startPoints: StartPoint[]; onChanged: () => Promise<void>; onAddStops: () => void; readyCount: number }) {
  const [saved, setSaved] = useState<SavedRoute>(readSaved);
  const order = saved.order;
  const pickupPending = saved.pickup !== null && order.includes("pickup");
  const [start] = useState<Point | undefined>(() => { try { return JSON.parse(store.get(`${startKey}-point`) ?? "null") ?? startPoints[0]; } catch { return startPoints[0]; } });
  const sorted = useMemo(() => [...deliveries].sort((a, b) => {
    const ia = order.indexOf(a.reference); const ib = order.indexOf(b.reference);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  }), [deliveries, order]);
  // The list in route order: deliveries still to go, with the shop pick-up where it falls.
  const items: (Delivery | "pickup")[] = useMemo(() => {
    const list: (Delivery | "pickup")[] = [...sorted];
    if (pickupPending) {
      const after = order.slice(order.indexOf("pickup") + 1);
      const at = list.findIndex((item) => item !== "pickup" && after.includes(item.reference));
      list.splice(at < 0 ? list.length : at, 0, "pickup");
    }
    return list;
  }, [sorted, order, pickupPending]);
  const stops: RouteStop[] = items.flatMap((item) => item === "pickup" ? [shopStop(saved.pickup!, "pickup")] : pinned(item) ? [{ key: item.reference, label: name(item), latitude: item.latitude!, longitude: item.longitude! }] : []);
  const withFinish = saved.finish ? [...stops, shopStop(saved.finish, "finish")] : stops;
  const pickedUp = () => { const next = { ...saved, order: order.filter((key) => key !== "pickup"), pickup: null, waiting: [] }; store.set(orderKey, JSON.stringify(next)); setSaved(next); };
  const [path, setPath] = useState<[number, number][]>();
  const stopsKey = stops.map((stop) => stop.key).join(",");

  // Redraw the road path for the stops still to go (in the order the courier set off with).
  useEffect(() => {
    if (!start || !stops.length) return;
    let active = true;
    fetch("/api/staff-deliveries/route", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: { latitude: start.latitude, longitude: start.longitude }, references: stops.filter((stop) => !stop.variant).map((stop) => stop.key),
        pickup_point_id: pickupPending ? saved.pickup!.id : null, pickup_references: pickupPending ? saved.waiting.filter((reference) => stops.some((stop) => stop.key === reference)) : [],
        finish_point_id: saved.finish?.id ?? null }) })
      .then((response) => response.ok ? response.json() : undefined).then((result) => { if (active) setPath(result?.route?.path); }).catch(() => undefined);
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, start?.latitude, start?.longitude, pickupPending]);

  if (!sorted.length) return <p className="courier-empty"><strong>No stops on the way.</strong> Plan a route to start delivering.</p>;
  return <div className="courier-plan">
    <div className="courier-map-wrap"><RouteMap start={start} stops={withFinish} path={stops.length ? path : undefined} /></div>
        <div className="courier-google-row">
    {stops.length > 0 && <a className="courier-wide-link is-google" href={googleDirections(undefined, withFinish)} target="_blank" rel="noreferrer">
      Google Maps<ArrowUpRight size={16} /></a>}
      <button type="button" className="courier-add-stops" onClick={onAddStops} aria-label={`Add more stops${readyCount ? `, ${readyCount} ready` : ""}`} title="Add more stops">
        <Plus size={22} />{readyCount > 0 && <span>{readyCount}</span>}</button>
    </div>
    <p className="courier-hint courier-dock-note">{stops.length > googleStopLimit ? `Starts from where you are with the next ${googleStopLimit} stops. Mark stops delivered here, then tap again for the rest.` : "Starts from where you are. Mark each stop delivered here as you go."}</p>
    <ol className="courier-list">{items.map((item, index) => item === "pickup"
      ? <PickupCard key="pickup" shop={saved.pickup!} count={saved.waiting.length} next={index === 0} onPickedUp={pickedUp} />
      : <StopCard key={item.reference} delivery={item} number={items.slice(0, index + 1).filter((entry) => entry !== "pickup").length} next={index === 0} onDone={onChanged} />)}</ol>
    {saved.finish && <p className="courier-hint courier-dock-note">Finish at {saved.finish.name}.</p>}
  </div>;
}

function PickupCard({ shop, count, next, onPickedUp }: { shop: Shop; count: number; next: boolean; onPickedUp: () => void }) {
  return <li className={`courier-stop courier-pickup${next ? " is-next" : ""}`}>
    <div className="courier-stop-main"><span className="courier-stop-number">P</span>
      <span className="courier-stop-body"><span className="courier-stop-top"><strong>Pick up at {shop.name}</strong>{next && <em data-tone="today">Next</em>}</span>
        <small>{count} new {count === 1 ? "order" : "orders"} to collect{shop.address ? ` · ${shop.address}` : ""}</small></span></div>
    <div className="courier-stop-detail"><div className="courier-actions">
      <a href={googleDirections(undefined, [shop])} target="_blank" rel="noreferrer">Navigate<ArrowUpRight size={15} /></a>
      <button type="button" className="is-primary" onClick={onPickedUp}><Check size={16} />Picked up</button>
    </div></div>
  </li>;
}

function StopCard({ delivery, number, next, onDone }: { delivery: Delivery; number: number; next: boolean; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(next);
  const [confirming, setConfirming] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId] = useState(createRequestId);
  const phone = delivery.phone ?? delivery.customer.phone;
  const navigate = pinned(delivery) ? googleDirections(undefined, [delivery]) : delivery.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([delivery.address, delivery.area, "Ghana"].filter(Boolean).join(", "))}` : undefined;

  async function postpone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/staff-deliveries/${encodeURIComponent(delivery.reference)}/postpone`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: String(form.get("reason") ?? "").trim(), new_date: form.get("new_date") || null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Couldn’t move the delivery.");
      await onDone();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t move the delivery."); setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/staff-deliveries/${encodeURIComponent(delivery.reference)}/delivered`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, note: String(new FormData(event.currentTarget).get("note") ?? "").trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Couldn’t confirm the delivery.");
      await onDone();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t confirm the delivery."); setBusy(false); }
  }

  return <li className={`courier-stop${next ? " is-next" : ""}`}>
    <button type="button" className="courier-stop-main" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="courier-stop-number">{number}</span>
      <span className="courier-stop-body"><span className="courier-stop-top"><strong>{name(delivery)}</strong>{next && <em data-tone="today">Next</em>}</span>
        <small>{[delivery.address, delivery.area].filter(Boolean).join(", ") || "No address"}</small></span>
      <ChevronDown size={18} className="courier-chevron" />
    </button>
    {open && <div className="courier-stop-detail">
      <dl>
        <div><dt>Order type</dt><dd>{orderType(delivery)}</dd></div>
        <div><dt>Garments</dt><dd>{delivery.garments.join(" · ")}</dd></div>
        {delivery.gps_code && <div><dt>GPS</dt><dd>{delivery.gps_code}</dd></div>}
        {delivery.directions && <div><dt>Directions</dt><dd>{delivery.directions}</dd></div>}
        {delivery.instructions && <div><dt>Notes</dt><dd>{delivery.instructions}</dd></div>}
        <div><dt>Order</dt><dd>{delivery.reference}</dd></div>
        <div><dt>Phone</dt><dd>{phone ?? <span className="courier-no-phone">No number on this order. Ask the office.</span>}</dd></div>
      </dl>
      <div className="courier-actions">
        {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call</a> : <button type="button" disabled aria-label="Call (no number on this order)">Call</button>}
        {navigate && <a href={navigate} target="_blank" rel="noreferrer">Navigate<ArrowUpRight size={15} /></a>}
        {!confirming && <button type="button" className="is-primary" onClick={() => { setConfirming(true); setPostponing(false); }}><Check size={16} />Delivered</button>}
      </div>
      {!confirming && !postponing && <button type="button" className="courier-not-today" onClick={() => setPostponing(true)}>Not today</button>}
      {postponing && <form className="courier-confirm" onSubmit={postpone}>
        <label>Why not today?<textarea name="reason" rows={2} required minLength={3} maxLength={500} placeholder="e.g. Customer called, travelling until Friday" disabled={busy} autoFocus /></label>
        <label>New delivery day (if agreed)<input name="new_date" type="date" min={localDate(1)} max={localDate(89)} disabled={busy} /></label>
        <p className="courier-hint">It comes off today’s route and goes back to your ready list. The customer is told.</p>
        {error && <p className="collection-error" role="alert">{error}</p>}
        <div className="courier-actions"><button type="button" disabled={busy} onClick={() => setPostponing(false)}>Back</button>
          <button type="submit" className="is-primary" disabled={busy}>{busy ? "Saving…" : "Move delivery"}</button></div>
      </form>}
      {confirming && <form className="courier-confirm" onSubmit={submit}>
        <label>Who received it?<textarea name="note" rows={2} required minLength={3} maxLength={1000} placeholder="e.g. Handed to Ama at the gate" disabled={busy} autoFocus /></label>
        {error && <p className="collection-error" role="alert">{error}</p>}
        <div className="courier-actions"><button type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
          <button type="submit" className="is-primary" disabled={busy}>{busy ? "Saving…" : "Confirm delivered"}</button></div>
      </form>}
    </div>}
  </li>;
}

/** A map pin, drawn in the NY icon line style (the shared icon set has no pin). */
function FilterIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></svg>;
}

/** A bottom sheet for phone choices: slides up over the screen; closes on the backdrop, Escape or the close button. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return <div className="sheet-layer">
    <button type="button" className="sheet-backdrop" aria-label="Close" onClick={onClose} />
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <span className="sheet-grip" aria-hidden="true" />
      <div className="sheet-head"><h2>{title}</h2><button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>;
}

function SheetOption({ checked, label, detail, onPick }: { checked: boolean; label: string; detail?: string; onPick: () => void }) {
  return <button type="button" role="radio" aria-checked={checked} className="sheet-option" onClick={onPick}>
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
    <span className="sheet-tick" aria-hidden="true">{checked && <Check size={15} />}</span>
  </button>;
}

export function ReloadButton({ onReload }: { onReload: () => void }) {
  return <button type="button" className="courier-icon-button" aria-label="Refresh deliveries" onClick={onReload}><RefreshCw size={18} /></button>;
}
