"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Search } from "@/components/icons";

export type MapPin = { latitude: number; longitude: number };

/** Accra, where most NY Atelier deliveries go; the map opens here until a pin is placed. */
const accra: [number, number] = [5.6037, -0.187];

export const googleMapsLink = (pin: MapPin) => `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;

/**
 * An OpenStreetMap map for a delivery spot. Staff tap the map or drag the pin; the search box
 * looks up a place in Ghana (OpenStreetMap Nominatim) and moves the pin there.
 */
export default function DeliveryMap({ pin, onChange, searchHint = "", readOnly = false }: { pin?: MapPin; onChange?: (pin?: MapPin) => void; searchHint?: string; readOnly?: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const changed = useRef(onChange);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { changed.current = onChange; }, [onChange]);

  // Leaflet needs the browser, so it is loaded once the map container exists.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !element.current || map.current) return;
      const view = L.map(element.current, { center: accra, zoom: 12, scrollWheelZoom: !readOnly, dragging: true, zoomControl: true, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(view);
      map.current = view;
      if (!readOnly) view.on("click", (event) => changed.current?.({ latitude: round(event.latlng.lat), longitude: round(event.latlng.lng) }));
      placeMarker(L);
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null; };
    // The map is created once; pin changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(L: typeof import("leaflet")) {
    const view = map.current;
    if (!view) return;
    if (!pin) { marker.current?.remove(); marker.current = null; return; }
    const position: [number, number] = [pin.latitude, pin.longitude];
    if (!marker.current) {
      const icon = L.divIcon({ className: "delivery-map-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
      marker.current = L.marker(position, { icon, draggable: !readOnly, keyboard: !readOnly, title: "Delivery spot" }).addTo(view);
      marker.current.on("dragend", () => { const point = marker.current!.getLatLng(); changed.current?.({ latitude: round(point.lat), longitude: round(point.lng) }); });
    } else marker.current.setLatLng(position);
    if (!view.getBounds().pad(-0.1).contains(position)) view.setView(position, Math.max(view.getZoom(), 15));
  }

  useEffect(() => { if (map.current) import("leaflet").then(placeMarker); });

  async function find() {
    const text = (query || searchHint).trim();
    if (!text || searching) return;
    setSearching(true); setMessage("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gh&q=${encodeURIComponent(text)}`, { headers: { Accept: "application/json" } });
      const results = response.ok ? await response.json() as { lat: string; lon: string }[] : [];
      if (!results.length) { setMessage("That place wasn’t found. Try a nearby landmark or area, or tap the map."); return; }
      const next = { latitude: round(Number(results[0].lat)), longitude: round(Number(results[0].lon)) };
      onChange?.(next);
      map.current?.setView([next.latitude, next.longitude], 16);
    } catch {
      setMessage("Place search is unavailable. Tap the map to place the pin.");
    } finally { setSearching(false); }
  }

  return <div className={`delivery-map${readOnly ? " is-read-only" : ""}`}>
    {!readOnly && <div className="delivery-map-search">
      <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Find a place on the map</span>
        <input type="search" value={query} placeholder={searchHint ? `Find “${searchHint}”` : "Find an area or landmark"} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void find(); } }} /></label>
      <button type="button" className="inventory-quiet-button" onClick={find} disabled={searching || !(query || searchHint).trim()}>{searching ? "Finding…" : "Find"}</button>
    </div>}
    <div ref={element} className="delivery-map-canvas" role="application" aria-label={readOnly ? "Delivery spot on the map" : "Map: tap to place the delivery pin, or drag the pin"} />
    {!readOnly && <div className="delivery-map-status">
      <span role="status">{message || (pin ? `Pin placed · ${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}` : "Tap the map to drop a pin on the delivery spot.")}</span>
      {pin && <button type="button" className="inventory-quiet-button" onClick={() => onChange?.(undefined)}>Remove pin</button>}
    </div>}
  </div>;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;
