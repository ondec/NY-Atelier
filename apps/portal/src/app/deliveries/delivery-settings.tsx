"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { MapPin } from "../delivery-map";

const DeliveryMap = dynamic(() => import("../delivery-map"), { ssr: false });

export type Zone = { id: number; name: string; min_days: number; max_days: number; active: boolean; label: string };
type Shop = { id: number; name: string; address: string | null; latitude: number; longitude: number; active: boolean };

async function send(url: string, method: "POST" | "PATCH", body: object, fallback: string) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || fallback);
  return result;
}

/**
 * Delivery set-up: areas with the delivery window promised to customers (an order's area fixes its delivery dates),
 * and the shops couriers can start a route from.
 */
export default function DeliverySettings({ onChanged }: { onChanged: () => void }) {
  const [zones, setZones] = useState<Zone[]>();
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(() => fetch("/api/staff-deliveries/settings", { cache: "no-store" }).then((response) => response.json())
    .then((result) => { setZones(result.zones ?? []); setShops(result.start_points ?? []); }).catch(() => setError("Couldn’t load the set-up.")), []);
  useEffect(() => { void load(); }, [load]);
  const changed = async () => { await load(); onChanged(); };

  return <section className="delivery-settings" aria-label="Delivery areas and shops">
    {error && <p className="collection-error" role="alert">{error}</p>}
    <div className="delivery-settings-block">
      <h2>Delivery areas</h2>
      <p className="production-muted">Each area promises a delivery window, counted from the day the order is placed. Choosing an order’s area sets its delivery dates.</p>
      <ul className="settings-rows">{zones?.map((zone) => <li key={zone.id}><ZoneForm zone={zone} onSaved={changed} /></li>)}</ul>
      <ZoneForm onSaved={changed} />
    </div>
    <div className="delivery-settings-block">
      <h2>Shops</h2>
      <p className="production-muted">Couriers can start a route from any of these, from where they are, or from a pin they drop.</p>
      <ul className="settings-rows">{shops.map((shop) => <li key={shop.id}><ShopForm shop={shop} onSaved={changed} /></li>)}</ul>
      <ShopForm onSaved={changed} />
    </div>
  </section>;
}

function ZoneForm({ zone, onSaved }: { zone?: Zone; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      await send(zone ? `/api/staff-deliveries/settings/zones/${zone.id}` : "/api/staff-deliveries/settings/zones", zone ? "PATCH" : "POST",
        { name: data.get("name"), min_days: Number(data.get("min_days")), max_days: Number(data.get("max_days")), active: zone ? data.get("active") === "on" : true }, "Couldn’t save the area.");
      if (!zone) form.reset(); else setSaved(true);
      await onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save the area."); } finally { setBusy(false); }
  }
  return <form className={`settings-row${zone ? "" : " is-new"}`} onSubmit={submit} onChange={() => setSaved(false)}>
    <label className="settings-name">{zone ? "Area" : "New area"}<input name="name" defaultValue={zone?.name} required maxLength={80} placeholder="e.g. Inside Accra" /></label>
    <label className="settings-days">From<input name="min_days" type="number" inputMode="numeric" min={0} max={60} defaultValue={zone?.min_days ?? 2} required /></label>
    <label className="settings-days">To<input name="max_days" type="number" inputMode="numeric" min={0} max={60} defaultValue={zone?.max_days ?? 3} required /></label>
    <span className="settings-unit">days</span>
    {zone && <label className="settings-check"><input name="active" type="checkbox" defaultChecked={zone.active} />In use</label>}
    <button type="submit" className="inventory-quiet-button" disabled={busy}>{busy ? "Saving…" : saved ? "Saved" : zone ? "Save" : "Add area"}</button>
    {error && <p className="collection-error" role="alert">{error}</p>}
  </form>;
}

function ShopForm({ shop, onSaved }: { shop?: Shop; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState<MapPin | undefined>(shop ? { latitude: shop.latitude, longitude: shop.longitude } : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) { setError("Place the shop on the map."); return; }
    setBusy(true); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      await send(shop ? `/api/staff-deliveries/settings/start-points/${shop.id}` : "/api/staff-deliveries/settings/start-points", shop ? "PATCH" : "POST",
        { name: data.get("name"), address: data.get("address"), latitude: pin.latitude, longitude: pin.longitude, active: shop ? data.get("active") === "on" : true }, "Couldn’t save the shop.");
      if (!shop) { form.reset(); setPin(undefined); }
      setOpen(false);
      await onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save the shop."); } finally { setBusy(false); }
  }
  if (!open) return <div className="settings-row">
    {shop ? <span className="settings-name"><strong>{shop.name}</strong><small>{shop.address ?? "Pinned on the map"}{shop.active ? "" : " · not in use"}</small></span> : null}
    <button type="button" className="inventory-quiet-button" onClick={() => setOpen(true)}>{shop ? "Edit" : "Add shop"}</button>
  </div>;
  return <form className="settings-shop" onSubmit={submit}>
    <label>Shop name<input name="name" defaultValue={shop?.name} required maxLength={80} placeholder="e.g. Osu studio" /></label>
    <label>Address (optional)<input name="address" defaultValue={shop?.address ?? ""} maxLength={255} /></label>
    <DeliveryMap pin={pin} onChange={setPin} />
    {shop && <label className="settings-check"><input name="active" type="checkbox" defaultChecked={shop.active} />In use</label>}
    {error && <p className="collection-error" role="alert">{error}</p>}
    <div className="order-secondary-actions"><button type="submit" className="create-bill-button" disabled={busy}>{busy ? "Saving…" : "Save shop"}</button>
      <button type="button" className="inventory-quiet-button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
  </form>;
}
